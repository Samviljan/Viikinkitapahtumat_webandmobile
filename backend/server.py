from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import secrets
import uuid
from html import escape as html_escape
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import bcrypt
import httpx
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, BackgroundTasks, UploadFile, File
from fastapi.responses import PlainTextResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

from email_service import (
    notify_admin_new_event,
    notify_submitter_decision,
    send_subscribe_confirmation,
    send_monthly_digest as svc_send_monthly_digest,
    send_weekly_admin_report as svc_send_weekly_admin_report,
    send_reminder_confirmation as svc_send_reminder_confirmation,
    send_event_reminders as svc_send_event_reminders,
    send_password_reset as svc_send_password_reset,
    make_unsubscribe_token,
)
from push_service import send_to_users as push_send_to_users
from translation_service import fill_missing_translations


# -----------------------------------------------------------------------------
# DB & App setup
# -----------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Viikinkitapahtumat API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"


# -----------------------------------------------------------------------------
# Auth helpers
# -----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # has_password: True for legacy admin + email/password users; False for
        # Google-only users so the frontend can hide the "change password" link.
        user["has_password"] = bool(user.get("password_hash"))
        user.pop("password_hash", None)
        user.pop("password_reset_token", None)
        user.pop("password_reset_expires", None)
        user.setdefault("nickname", None)
        user.setdefault("user_types", [])
        user.setdefault("merchant_name", None)
        user.setdefault("organizer_name", None)
        user.setdefault("consent_organizer_messages", False)
        user.setdefault("consent_merchant_offers", False)
        user.setdefault("saved_search", None)
        user.setdefault("paid_messaging_enabled", False)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SavedSearch(BaseModel):
    """Default search filters that apply when the logged-in user opens the
    events list. Mirrored on web and mobile."""

    model_config = ConfigDict(extra="ignore")
    radius_km: Optional[int] = None  # null = no radius filter
    categories: List[str] = []  # empty = all categories
    countries: List[str] = []  # empty = all countries


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    nickname: Optional[str] = None
    user_types: List[str] = []
    has_password: bool = True
    merchant_name: Optional[str] = None
    organizer_name: Optional[str] = None
    consent_organizer_messages: bool = False
    consent_merchant_offers: bool = False
    saved_search: Optional[SavedSearch] = None
    paid_messaging_enabled: bool = False


USER_TYPES = {"reenactor", "fighter", "merchant", "organizer"}


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nickname: str
    user_types: List[str] = []
    merchant_name: Optional[str] = None
    organizer_name: Optional[str] = None
    consent_organizer_messages: bool = False
    consent_merchant_offers: bool = False


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    user_types: Optional[List[str]] = None
    merchant_name: Optional[str] = None
    organizer_name: Optional[str] = None
    consent_organizer_messages: Optional[bool] = None
    consent_merchant_offers: Optional[bool] = None
    saved_search: Optional[SavedSearch] = None


class GoogleSessionRequest(BaseModel):
    session_id: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class AttendRequest(BaseModel):
    notify_email: bool = True
    notify_push: bool = False


class PushTokenRequest(BaseModel):
    """Mobile registers its Expo Push Token after acquiring it from
    `Notifications.getExpoPushTokenAsync`."""

    expo_push_token: str
    platform: Optional[str] = None  # "ios" | "android"


class PaidMessagingToggle(BaseModel):
    enabled: bool


class SendMessageRequest(BaseModel):
    """Organizer/merchant sends a single message to all attendees of one of
    their events. Channel = "push", "email", or "both". Recipients are
    filtered by the appropriate consent flag and `notify_*` per-RSVP."""

    event_id: str
    channel: Literal["push", "email", "both"] = "both"
    subject: str
    body: str


EventCategory = Literal["market", "training_camp", "course", "festival", "meetup", "other"]
EventStatus = Literal["pending", "approved", "rejected"]
EventCountry = Literal["FI", "SE", "EE", "NO", "DK", "PL", "DE", "IS", "LV", "LT"]


class EventCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title_fi: str
    title_en: Optional[str] = ""
    title_sv: Optional[str] = ""
    description_fi: str
    description_en: Optional[str] = ""
    description_sv: Optional[str] = ""
    category: EventCategory = "other"
    country: EventCountry = "FI"
    location: str
    start_date: str
    end_date: Optional[str] = None
    organizer: str
    organizer_email: Optional[EmailStr] = None
    link: Optional[str] = ""
    image_url: Optional[str] = ""
    gallery: List[str] = []
    audience: Optional[str] = ""
    fight_style: Optional[str] = ""
    program_pdf_url: Optional[str] = ""


class EventOut(BaseModel):
    id: str
    title_fi: str
    title_en: str
    title_sv: str
    title_da: Optional[str] = ""
    title_de: Optional[str] = ""
    title_et: Optional[str] = ""
    title_pl: Optional[str] = ""
    description_fi: str
    description_en: str
    description_sv: str
    description_da: Optional[str] = ""
    description_de: Optional[str] = ""
    description_et: Optional[str] = ""
    description_pl: Optional[str] = ""
    category: str
    country: str = "FI"
    location: str
    start_date: str
    end_date: Optional[str] = None
    organizer: str
    organizer_email: Optional[str] = None
    link: str
    image_url: str
    gallery: List[str] = []
    status: str
    created_at: str
    audience: Optional[str] = ""
    fight_style: Optional[str] = ""
    program_pdf_url: Optional[str] = ""


class EventStatusUpdate(BaseModel):
    status: EventStatus


class EventEdit(BaseModel):
    """Full editable event payload for admin update (status not editable here)."""
    model_config = ConfigDict(extra="ignore")
    title_fi: str
    title_en: Optional[str] = ""
    title_sv: Optional[str] = ""
    description_fi: str
    description_en: Optional[str] = ""
    description_sv: Optional[str] = ""
    category: EventCategory = "other"
    country: EventCountry = "FI"
    location: str
    start_date: str
    end_date: Optional[str] = None
    organizer: str
    organizer_email: Optional[EmailStr] = None
    link: Optional[str] = ""
    image_url: Optional[str] = ""
    gallery: List[str] = []
    audience: Optional[str] = ""
    fight_style: Optional[str] = ""
    program_pdf_url: Optional[str] = ""


MerchantCategory = Literal["gear", "smith"]
GuildCategory = Literal["svtl_member", "other"]


class MerchantIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: Optional[str] = ""
    url: Optional[str] = ""
    category: MerchantCategory = "gear"
    order_index: Optional[int] = 0


class MerchantOut(BaseModel):
    id: str
    name: str
    description: str
    url: str
    category: str
    order_index: int


class GuildIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    region: Optional[str] = ""
    url: Optional[str] = ""
    category: GuildCategory = "other"
    order_index: Optional[int] = 0


class GuildOut(BaseModel):
    id: str
    name: str
    region: str
    url: str
    category: str
    order_index: int


class SubscribeRequest(BaseModel):
    email: EmailStr
    lang: Optional[str] = "fi"


class ReminderRequest(BaseModel):
    email: EmailStr
    lang: Optional[str] = "fi"


# -----------------------------------------------------------------------------
# Auth routes
# -----------------------------------------------------------------------------
@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(
        payload.password, user["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/",
    )
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "nickname": user.get("nickname"),
        "user_types": user.get("user_types", []),
        "merchant_name": user.get("merchant_name"),
        "organizer_name": user.get("organizer_name"),
        "consent_organizer_messages": bool(user.get("consent_organizer_messages", False)),
        "consent_merchant_offers": bool(user.get("consent_merchant_offers", False)),
        "saved_search": user.get("saved_search"),
        "paid_messaging_enabled": bool(user.get("paid_messaging_enabled", False)),
        "has_password": True,
        "token": token,
    }


@api_router.post("/auth/register", status_code=201)
async def register(payload: RegisterRequest, response: Response):
    """End-user registration. Distinct from the seeded admin account: new users
    always receive role="user". An existing email returns 409 so the client can
    redirect to the login flow instead.
    """
    email = payload.email.lower().strip()
    nick = payload.nickname.strip()
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not nick:
        raise HTTPException(status_code=400, detail="Nickname is required")
    bad = [t for t in payload.user_types if t not in USER_TYPES]
    if bad:
        raise HTTPException(status_code=400, detail=f"Invalid user_type(s): {bad}")
    if "merchant" in payload.user_types and not (payload.merchant_name or "").strip():
        raise HTTPException(
            status_code=400, detail="Merchant name (shop name) is required when 'merchant' is selected"
        )
    if "organizer" in payload.user_types and not (payload.organizer_name or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Organizer name (event/organization name) is required when 'organizer' is selected",
        )

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    types = list(set(payload.user_types))
    doc = {
        "id": user_id,
        "email": email,
        "name": nick,
        "nickname": nick,
        "role": "user",
        "user_types": types,
        "merchant_name": (payload.merchant_name or "").strip() if "merchant" in types else None,
        "organizer_name": (payload.organizer_name or "").strip() if "organizer" in types else None,
        "consent_organizer_messages": bool(payload.consent_organizer_messages),
        "consent_merchant_offers": bool(payload.consent_merchant_offers),
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)

    token = create_access_token(user_id, email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/",
    )
    return {
        "id": user_id,
        "email": email,
        "name": nick,
        "nickname": nick,
        "role": "user",
        "user_types": doc["user_types"],
        "merchant_name": doc["merchant_name"],
        "organizer_name": doc["organizer_name"],
        "consent_organizer_messages": doc["consent_organizer_messages"],
        "consent_merchant_offers": doc["consent_merchant_offers"],
        "has_password": True,
        "token": token,
    }


@api_router.post("/auth/google-session")
async def google_session(payload: GoogleSessionRequest, response: Response):
    """Exchange a one-time Emergent Auth session_id for our own JWT.

    Calls Emergent's session-data endpoint server-side, then either creates a
    new user (Google-only, no password_hash) or LINKS the Google profile to an
    existing email/password user. Returns the same shape as /auth/login so the
    frontend can use one auth context.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": payload.session_id},
            )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Auth provider unavailable: {e}")

    email = (data.get("email") or "").lower().strip()
    name = data.get("name") or email.split("@")[0]
    google_id = data.get("id")
    if not email or not google_id:
        raise HTTPException(status_code=400, detail="Incomplete profile from auth provider")

    user = await db.users.find_one({"email": email})
    if user:
        # Link Google id if missing.
        if not user.get("google_id"):
            await db.users.update_one(
                {"id": user["id"]}, {"$set": {"google_id": google_id}}
            )
        user_id = user["id"]
        role = user["role"]
        nickname = user.get("nickname") or user.get("name") or name
        user_types = user.get("user_types", [])
        has_password = bool(user.get("password_hash"))
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        nickname = name
        user_types = []
        role = "user"
        has_password = False
        await db.users.insert_one(
            {
                "id": user_id,
                "email": email,
                "name": name,
                "nickname": nickname,
                "google_id": google_id,
                "role": role,
                "user_types": user_types,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    token = create_access_token(user_id, email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/",
    )
    return {
        "id": user_id,
        "email": email,
        "name": nickname,
        "nickname": nickname,
        "role": role,
        "user_types": user_types,
        "has_password": has_password,
        "token": token,
    }


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


@api_router.patch("/auth/profile", response_model=UserOut)
async def update_profile(
    payload: ProfileUpdate, user: dict = Depends(get_current_user)
):
    update: dict = {}
    if payload.nickname is not None:
        nick = payload.nickname.strip()
        if not nick:
            raise HTTPException(status_code=400, detail="Nickname cannot be empty")
        update["nickname"] = nick
        update["name"] = nick  # keep `name` (legacy) in sync for compatibility
    if payload.user_types is not None:
        bad = [t for t in payload.user_types if t not in USER_TYPES]
        if bad:
            raise HTTPException(status_code=400, detail=f"Invalid user_type(s): {bad}")
        update["user_types"] = list(set(payload.user_types))
        # Require a name when adding merchant/organizer (use the value from this
        # request OR the value already on file).
        if "merchant" in update["user_types"]:
            mname = (
                (payload.merchant_name or "").strip()
                if payload.merchant_name is not None
                else (user.get("merchant_name") or "")
            )
            if not mname:
                raise HTTPException(
                    status_code=400,
                    detail="Merchant name is required when 'merchant' is selected",
                )
        if "organizer" in update["user_types"]:
            oname = (
                (payload.organizer_name or "").strip()
                if payload.organizer_name is not None
                else (user.get("organizer_name") or "")
            )
            if not oname:
                raise HTTPException(
                    status_code=400,
                    detail="Organizer name is required when 'organizer' is selected",
                )
    if payload.merchant_name is not None:
        update["merchant_name"] = payload.merchant_name.strip() or None
    if payload.organizer_name is not None:
        update["organizer_name"] = payload.organizer_name.strip() or None
    if payload.consent_organizer_messages is not None:
        update["consent_organizer_messages"] = bool(payload.consent_organizer_messages)
    if payload.consent_merchant_offers is not None:
        update["consent_merchant_offers"] = bool(payload.consent_merchant_offers)
    if payload.saved_search is not None:
        ss = payload.saved_search
        update["saved_search"] = {
            "radius_km": ss.radius_km,
            "categories": list(ss.categories or []),
            "countries": list(ss.countries or []),
        }

    # If user removes "merchant"/"organizer" from user_types, also clear the
    # corresponding name field so stale data doesn't linger.
    if "user_types" in update:
        if "merchant" not in update["user_types"]:
            update["merchant_name"] = None
        if "organizer" not in update["user_types"]:
            update["organizer_name"] = None

    if not update:
        return UserOut(**user)
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    fresh["has_password"] = bool(fresh.get("password_hash"))
    fresh.pop("password_hash", None)
    fresh.pop("password_reset_token", None)
    fresh.pop("password_reset_expires", None)
    fresh.setdefault("nickname", None)
    fresh.setdefault("user_types", [])
    fresh.setdefault("merchant_name", None)
    fresh.setdefault("organizer_name", None)
    fresh.setdefault("consent_organizer_messages", False)
    fresh.setdefault("consent_merchant_offers", False)
    fresh.setdefault("saved_search", None)
    fresh.setdefault("paid_messaging_enabled", False)
    return UserOut(**fresh)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# -----------------------------------------------------------------------------
# Password reset
# -----------------------------------------------------------------------------
RESET_TOKEN_TTL_MIN = 60  # minutes


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, background: BackgroundTasks):
    """Request a password-reset link.

    Always returns 200 to avoid leaking which addresses are registered.
    Sends an email only if the address is on file AND the user has a
    password (Google-only accounts are skipped).
    """
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user and user.get("password_hash"):
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MIN)
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "password_reset_token": token,
                    "password_reset_expires": expires.isoformat(),
                }
            },
        )
        background.add_task(svc_send_password_reset, email, token)
    return {"ok": True}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = await db.users.find_one({"password_reset_token": payload.token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires_iso = user.get("password_reset_expires") or ""
    try:
        expires = datetime.fromisoformat(expires_iso)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {"password_hash": hash_password(payload.new_password)},
            "$unset": {"password_reset_token": "", "password_reset_expires": ""},
        },
    )
    return {"ok": True}


# -----------------------------------------------------------------------------
# Event attendance (logged-in users RSVP to events with notification prefs)
# -----------------------------------------------------------------------------
def _attendance_doc(event_id: str, user_id: str, payload: AttendRequest) -> dict:
    return {
        "event_id": event_id,
        "user_id": user_id,
        "notify_email": bool(payload.notify_email),
        "notify_push": bool(payload.notify_push),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@api_router.post("/events/{event_id}/attend")
async def attend_event(
    event_id: str, payload: AttendRequest, user: dict = Depends(get_current_user)
):
    ev = await db.events.find_one({"id": event_id, "status": "approved"}, {"_id": 0, "id": 1})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    doc = _attendance_doc(event_id, user["id"], payload)
    existing = await db.event_attendees.find_one(
        {"event_id": event_id, "user_id": user["id"]}, {"_id": 0}
    )
    if existing:
        await db.event_attendees.update_one(
            {"event_id": event_id, "user_id": user["id"]}, {"$set": doc}
        )
    else:
        doc["created_at"] = doc["updated_at"]
        await db.event_attendees.insert_one(doc)
    return {
        "attending": True,
        "notify_email": doc["notify_email"],
        "notify_push": doc["notify_push"],
    }


@api_router.delete("/events/{event_id}/attend")
async def cancel_attendance(event_id: str, user: dict = Depends(get_current_user)):
    await db.event_attendees.delete_one(
        {"event_id": event_id, "user_id": user["id"]}
    )
    return {"attending": False}


@api_router.get("/events/{event_id}/attend")
async def get_attendance(event_id: str, user: dict = Depends(get_current_user)):
    row = await db.event_attendees.find_one(
        {"event_id": event_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not row:
        return {"attending": False, "notify_email": True, "notify_push": False}
    return {
        "attending": True,
        "notify_email": bool(row.get("notify_email", True)),
        "notify_push": bool(row.get("notify_push", False)),
    }


@api_router.get("/users/me/attending")
async def my_attending_events(user: dict = Depends(get_current_user)):
    rows = await db.event_attendees.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).to_list(1000)
    if not rows:
        return []
    event_ids = [r["event_id"] for r in rows]
    events = await db.events.find(
        {"id": {"$in": event_ids}, "status": "approved"}, {"_id": 0}
    ).to_list(1000)
    by_id = {e["id"]: e for e in events}
    out = []
    for r in rows:
        ev = by_id.get(r["event_id"])
        if not ev:
            continue
        out.append(
            {
                **ev,
                "attendance": {
                    "notify_email": bool(r.get("notify_email", True)),
                    "notify_push": bool(r.get("notify_push", False)),
                },
            }
        )
    return out


# -----------------------------------------------------------------------------
# Expo push token registration (mobile)
# -----------------------------------------------------------------------------
@api_router.post("/users/me/push-token")
async def register_push_token(
    payload: PushTokenRequest, user: dict = Depends(get_current_user)
):
    """Register or refresh the user's Expo Push Token. Tokens are stored as
    a list per user — devices come and go, and the backend prunes them
    automatically when Expo reports `DeviceNotRegistered`.
    """
    tk = (payload.expo_push_token or "").strip()
    if not (tk.startswith("ExponentPushToken[") or tk.startswith("ExpoPushToken[")):
        raise HTTPException(status_code=400, detail="Invalid Expo Push Token format")

    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"expo_push_tokens": tk}},
    )
    if payload.platform in ("ios", "android"):
        await db.users.update_one(
            {"id": user["id"], "expo_push_tokens": tk},
            {"$set": {f"push_token_meta.{tk}": {"platform": payload.platform}}},
        )
    return {"ok": True}


@api_router.delete("/users/me/push-token")
async def unregister_push_token(
    payload: PushTokenRequest, user: dict = Depends(get_current_user)
):
    """Remove a single token (e.g. when user signs out on a device)."""
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"expo_push_tokens": payload.expo_push_token}},
    )
    return {"ok": True}


# -----------------------------------------------------------------------------
# Anonymous attendance stats (visible to merchants/organizers — privacy-safe)
# -----------------------------------------------------------------------------
@api_router.get("/events/{event_id}/stats")
async def event_attendance_stats(
    event_id: str, user: dict = Depends(get_current_user)
):
    """Return *only counts* of reenactor and fighter attendees per event.
    No nicknames, emails or any other PII. Visible to merchants and
    organizers (so they can plan stalls/logistics) and admins.
    """
    user_types = set(user.get("user_types") or [])
    is_admin = user.get("role") == "admin"
    if not is_admin and not (user_types & {"merchant", "organizer"}):
        raise HTTPException(status_code=403, detail="Not allowed")

    ev = await db.events.find_one({"id": event_id, "status": "approved"}, {"_id": 0, "id": 1})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    rows = await db.event_attendees.find({"event_id": event_id}, {"_id": 0, "user_id": 1}).to_list(5000)
    if not rows:
        return {"reenactors": 0, "fighters": 0, "total": 0}
    user_ids = [r["user_id"] for r in rows]
    users = await db.users.find(
        {"id": {"$in": user_ids}}, {"_id": 0, "user_types": 1}
    ).to_list(5000)
    reenactors = sum(1 for u in users if "reenactor" in (u.get("user_types") or []))
    fighters = sum(1 for u in users if "fighter" in (u.get("user_types") or []))
    return {"reenactors": reenactors, "fighters": fighters, "total": len(users)}


# -----------------------------------------------------------------------------
# Paid messaging — organizer/merchant sends a message to attendees
#   * Feature must be unlocked per-user via /admin/users/{id}/paid-messaging
#   * Recipients are filtered by:
#       - they are attending the event
#       - they have given consent (organizer → consent_organizer_messages,
#         merchant → consent_merchant_offers)
#       - per-attendance toggle for that channel (notify_push / notify_email)
# -----------------------------------------------------------------------------
@api_router.post("/messages/send")
async def send_message_to_attendees(
    payload: SendMessageRequest, user: dict = Depends(get_current_user)
):
    if not user.get("paid_messaging_enabled"):
        raise HTTPException(
            status_code=402,
            detail="Paid messaging is not enabled for this account",
        )
    user_types = set(user.get("user_types") or [])
    if not (user_types & {"merchant", "organizer"}):
        raise HTTPException(status_code=403, detail="Only merchants/organizers may send")

    ev = await db.events.find_one({"id": payload.event_id, "status": "approved"}, {"_id": 0})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Pick the consent flag matching the sender's role.
    consent_field = (
        "consent_organizer_messages" if "organizer" in user_types
        else "consent_merchant_offers"
    )

    rows = await db.event_attendees.find(
        {"event_id": payload.event_id}, {"_id": 0}
    ).to_list(5000)
    if not rows:
        return {"sent_push": 0, "sent_email": 0, "recipients": 0}

    user_ids = [r["user_id"] for r in rows]
    consenters = await db.users.find(
        {"id": {"$in": user_ids}, consent_field: True},
        {"_id": 0, "id": 1, "email": 1},
    ).to_list(5000)
    consenter_ids = {u["id"] for u in consenters}
    consenter_emails = {u["id"]: u["email"] for u in consenters}

    push_user_ids: list[str] = []
    email_recipients: list[str] = []
    for r in rows:
        uid = r["user_id"]
        if uid not in consenter_ids:
            continue
        if payload.channel in ("push", "both") and r.get("notify_push"):
            push_user_ids.append(uid)
        if payload.channel in ("email", "both") and r.get("notify_email"):
            email_recipients.append(consenter_emails[uid])

    sent_push = 0
    if push_user_ids:
        result = await push_send_to_users(
            db,
            push_user_ids,
            title=payload.subject,
            body=payload.body[:160],
            data={"event_id": payload.event_id},
        )
        sent_push = result.get("sent", 0)

    sent_email = 0
    if email_recipients:
        # Reuse the generic Resend wrapper.
        from email_service import send_email as svc_send_email
        site = os.environ.get("PUBLIC_SITE_URL", "https://viikinkitapahtumat.fi")
        ev_title = ev.get("title_fi") or ev.get("title") or "Viikinkitapahtumat"
        sender_name = user.get("organizer_name") or user.get("merchant_name") or user.get("nickname") or "Viikinkitapahtumat"
        html = (
            f"<div style='font-family:system-ui,Arial,sans-serif;background:#0E0B09;color:#E8E2D5;padding:24px;'>"
            f"<div style='max-width:560px;margin:auto;border:1px solid #352A23;padding:24px;'>"
            f"<div style='font-size:11px;letter-spacing:1.6px;color:#C19C4D;text-transform:uppercase;'>{html_escape(ev_title)}</div>"
            f"<h1 style='font-family:Georgia,serif;color:#E8E2D5;margin:8px 0 16px;'>{html_escape(payload.subject)}</h1>"
            f"<div style='white-space:pre-wrap;line-height:1.55;color:#E8E2D5;'>{html_escape(payload.body)}</div>"
            f"<hr style='border:none;border-top:1px solid #352A23;margin:24px 0;'>"
            f"<div style='font-size:11px;color:#8E8276;'>Lähettäjä: {html_escape(sender_name)} · "
            f"<a href='{site}/profile' style='color:#C19C4D;'>Hallinnoi viestiasetuksia</a></div>"
            f"</div></div>"
        )
        for em in email_recipients:
            try:
                await svc_send_email(em, payload.subject, html)
                sent_email += 1
            except Exception:
                logger.exception("Failed sending merchant/organizer email to %s", em)

    return_payload = {
        "sent_push": sent_push,
        "sent_email": sent_email,
        "recipients": len(consenter_ids),
    }
    # Audit trail — used by /admin/stats/messages.
    await db.message_log.insert_one(
        {
            "event_id": payload.event_id,
            "sender_id": user["id"],
            "channel": payload.channel,
            "subject": payload.subject[:200],
            "body_preview": payload.body[:200],
            "sent_push": sent_push,
            "sent_email": sent_email,
            "recipients": len(consenter_ids),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return return_payload


# -----------------------------------------------------------------------------
# Admin: enable/disable the paid messaging feature flag for a user
# -----------------------------------------------------------------------------
@api_router.get("/admin/users", dependencies=[Depends(get_admin_user)])
async def admin_list_users(role: Optional[str] = None):
    """Lightweight user listing for admin — id/email/nickname/role/types/flag.
    Never returns PII for non-admin contexts.
    """
    q: dict = {}
    if role:
        q["role"] = role
    docs = await db.users.find(
        q,
        {
            "_id": 0,
            "id": 1,
            "email": 1,
            "nickname": 1,
            "name": 1,
            "role": 1,
            "user_types": 1,
            "merchant_name": 1,
            "organizer_name": 1,
            "paid_messaging_enabled": 1,
            "created_at": 1,
        },
    ).sort("created_at", -1).to_list(2000)
    for d in docs:
        d.setdefault("paid_messaging_enabled", False)
        d.setdefault("user_types", [])
    return docs


@api_router.patch(
    "/admin/users/{user_id}/paid-messaging",
    dependencies=[Depends(get_admin_user)],
)
async def admin_toggle_paid_messaging(user_id: str, payload: PaidMessagingToggle):
    res = await db.users.update_one(
        {"id": user_id},
        {"$set": {"paid_messaging_enabled": bool(payload.enabled)}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user_id, "paid_messaging_enabled": bool(payload.enabled)}


# -----------------------------------------------------------------------------
# Daily reminders — push + email reminders for events in the next 3 days
# -----------------------------------------------------------------------------
async def _run_daily_event_reminders(window_days: int = 3) -> dict:
    """Find approved events occurring in [now, now + window_days], find all
    users RSVPed with notify_push/notify_email=true, and send. Idempotent
    per (event_id, channel, day) by storing a marker doc in `reminder_log`.
    """
    today = datetime.now(timezone.utc).date()
    horizon = today + timedelta(days=window_days)

    events = await db.events.find(
        {
            "status": "approved",
            "start_date": {
                "$gte": today.isoformat(),
                "$lte": horizon.isoformat(),
            },
        },
        {"_id": 0},
    ).to_list(500)

    summary = {"events_processed": 0, "push_sent": 0, "email_sent": 0}

    for ev in events:
        eid = ev["id"]
        rsvps = await db.event_attendees.find(
            {"event_id": eid}, {"_id": 0}
        ).to_list(5000)
        if not rsvps:
            continue

        push_user_ids = [r["user_id"] for r in rsvps if r.get("notify_push")]
        email_user_ids = [r["user_id"] for r in rsvps if r.get("notify_email")]

        # Push
        if push_user_ids:
            already = await db.reminder_log.find_one(
                {"event_id": eid, "channel": "push", "date": today.isoformat()}
            )
            if not already:
                title = ev.get("title_fi") or ev.get("title") or "Viikinkitapahtumat"
                body = "Tapahtuma alkaa pian — muista varata aika kalenteriin."
                result = await push_send_to_users(
                    db,
                    push_user_ids,
                    title=title,
                    body=body,
                    data={"event_id": eid},
                )
                summary["push_sent"] += int(result.get("sent", 0))
                await db.reminder_log.insert_one(
                    {
                        "event_id": eid,
                        "channel": "push",
                        "date": today.isoformat(),
                        "sent": result.get("sent", 0),
                    }
                )

        # Email — reuse existing reminder helper
        if email_user_ids:
            already_em = await db.reminder_log.find_one(
                {"event_id": eid, "channel": "email", "date": today.isoformat()}
            )
            if not already_em:
                from email_service import send_email as svc_send_email
                users = await db.users.find(
                    {"id": {"$in": email_user_ids}}, {"_id": 0, "email": 1}
                ).to_list(5000)
                ev_title = ev.get("title_fi") or ev.get("title") or "Viikinkitapahtumat"
                site = os.environ.get("PUBLIC_SITE_URL", "https://viikinkitapahtumat.fi")
                html = (
                    f"<div style='font-family:system-ui,Arial,sans-serif;background:#0E0B09;color:#E8E2D5;padding:24px;'>"
                    f"<div style='max-width:560px;margin:auto;border:1px solid #352A23;padding:24px;'>"
                    f"<div style='font-size:11px;letter-spacing:1.6px;color:#C19C4D;text-transform:uppercase;'>Muistutus</div>"
                    f"<h1 style='font-family:Georgia,serif;color:#E8E2D5;margin:8px 0 16px;'>{html_escape(ev_title)}</h1>"
                    f"<p>Tapahtuma alkaa pian. Tarkista lisätiedot <a href='{site}/events/{eid}' style='color:#C19C4D;'>täältä</a>.</p>"
                    f"<hr style='border:none;border-top:1px solid #352A23;margin:24px 0;'>"
                    f"<div style='font-size:11px;color:#8E8276;'><a href='{site}/profile' style='color:#C19C4D;'>Hallinnoi muistutusasetuksia</a></div>"
                    f"</div></div>"
                )
                sent_em = 0
                for u in users:
                    try:
                        await svc_send_email(u["email"], f"Muistutus: {ev_title}", html)
                        sent_em += 1
                    except Exception:
                        logger.exception("Failed reminder email to %s", u.get("email"))
                summary["email_sent"] += sent_em
                await db.reminder_log.insert_one(
                    {
                        "event_id": eid,
                        "channel": "email",
                        "date": today.isoformat(),
                        "sent": sent_em,
                    }
                )

        summary["events_processed"] += 1

    return summary


@api_router.post(
    "/admin/reminders/run-now",
    dependencies=[Depends(get_admin_user)],
)
async def admin_run_reminders(window_days: int = 3):
    """Manual trigger for daily reminders (also wired on a scheduler)."""
    return await _run_daily_event_reminders(window_days)


# -----------------------------------------------------------------------------
# Admin stats — aggregate metrics for the dashboard
# -----------------------------------------------------------------------------
@api_router.get(
    "/admin/stats/overview",
    dependencies=[Depends(get_admin_user)],
)
async def admin_stats_overview():
    """High-level KPIs visible at the top of the admin stats panel."""
    now = datetime.now(timezone.utc)
    last_30d = (now - timedelta(days=30)).isoformat()

    users_total = await db.users.count_documents({})
    paid_users = await db.users.count_documents({"paid_messaging_enabled": True})
    rsvps_total = await db.event_attendees.count_documents({})

    # Push delivery summary (computed from message_log + reminder_log)
    push_30d = await db.message_log.aggregate(
        [
            {"$match": {"created_at": {"$gte": last_30d}}},
            {
                "$group": {
                    "_id": None,
                    "sent_push": {"$sum": "$sent_push"},
                    "sent_email": {"$sum": "$sent_email"},
                    "recipients": {"$sum": "$recipients"},
                    "messages": {"$sum": 1},
                }
            },
        ]
    ).to_list(1)
    msg_summary = push_30d[0] if push_30d else {
        "sent_push": 0, "sent_email": 0, "recipients": 0, "messages": 0,
    }

    reminder_30d = await db.reminder_log.aggregate(
        [
            {"$match": {"date": {"$gte": (now - timedelta(days=30)).date().isoformat()}}},
            {
                "$group": {
                    "_id": "$channel",
                    "sent": {"$sum": "$sent"},
                    "events": {"$sum": 1},
                }
            },
        ]
    ).to_list(10)

    # Devices with push tokens
    push_devices = await db.users.count_documents(
        {"expo_push_tokens": {"$exists": True, "$ne": []}}
    )

    return {
        "users_total": users_total,
        "users_paid": paid_users,
        "rsvps_total": rsvps_total,
        "push_devices": push_devices,
        "messages_30d": {
            "messages": msg_summary.get("messages", 0),
            "sent_push": msg_summary.get("sent_push", 0),
            "sent_email": msg_summary.get("sent_email", 0),
            "recipients": msg_summary.get("recipients", 0),
        },
        "reminders_30d": {row["_id"]: row for row in reminder_30d},
    }


@api_router.get(
    "/admin/stats/messages",
    dependencies=[Depends(get_admin_user)],
)
async def admin_stats_messages(limit: int = 50):
    """Recent message-log entries — full audit trail of paid messages sent."""
    rows = await db.message_log.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    if not rows:
        return []
    # Enrich with event titles + sender info.
    event_ids = list({r["event_id"] for r in rows if r.get("event_id")})
    sender_ids = list({r["sender_id"] for r in rows if r.get("sender_id")})
    events = await db.events.find(
        {"id": {"$in": event_ids}},
        {"_id": 0, "id": 1, "title_fi": 1},
    ).to_list(500)
    senders = await db.users.find(
        {"id": {"$in": sender_ids}},
        {"_id": 0, "id": 1, "email": 1, "nickname": 1, "merchant_name": 1, "organizer_name": 1},
    ).to_list(500)
    ev_by = {e["id"]: e for e in events}
    sd_by = {u["id"]: u for u in senders}
    for r in rows:
        ev = ev_by.get(r.get("event_id"), {})
        sd = sd_by.get(r.get("sender_id"), {})
        r["event_title"] = ev.get("title_fi") or r.get("event_id")
        r["sender_label"] = (
            sd.get("organizer_name") or sd.get("merchant_name") or sd.get("nickname") or sd.get("email") or ""
        )
    return rows


@api_router.get(
    "/admin/stats/top-events",
    dependencies=[Depends(get_admin_user)],
)
async def admin_stats_top_events(limit: int = 10):
    """Top events by attendee count — sorted descending."""
    pipeline = [
        {"$group": {"_id": "$event_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    rows = await db.event_attendees.aggregate(pipeline).to_list(limit)
    if not rows:
        return []
    event_ids = [r["_id"] for r in rows]
    events = await db.events.find(
        {"id": {"$in": event_ids}},
        {"_id": 0, "id": 1, "title_fi": 1, "start_date": 1, "location": 1},
    ).to_list(limit)
    by_id = {e["id"]: e for e in events}
    out = []
    for r in rows:
        ev = by_id.get(r["_id"])
        if not ev:
            continue
        out.append(
            {
                "event_id": r["_id"],
                "title": ev.get("title_fi") or r["_id"],
                "start_date": ev.get("start_date"),
                "location": ev.get("location"),
                "attendees": r["count"],
            }
        )
    return out


# -----------------------------------------------------------------------------
# Public event routes
# -----------------------------------------------------------------------------
def _serialize_event(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "_id"}


# -----------------------------------------------------------------------------
# Image upload + library — GridFS-backed (survives container restarts)
# -----------------------------------------------------------------------------
from motor.motor_asyncio import AsyncIOMotorGridFSBucket  # noqa: E402

MAX_UPLOAD_BYTES = 6 * 1024 * 1024  # 6 MB
MAX_PROGRAM_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MIME_FOR_EXT = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}

_gridfs_bucket: Optional[AsyncIOMotorGridFSBucket] = None


def _bucket() -> AsyncIOMotorGridFSBucket:
    global _gridfs_bucket
    if _gridfs_bucket is None:
        _gridfs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="event_images")
    return _gridfs_bucket


def _public_upload_url(filename: str) -> str:
    return f"/api/uploads/events/{filename}"


@api_router.post("/uploads/events", status_code=201)
async def upload_event_image(file: UploadFile = File(...)):
    """Public upload — anyone submitting an event can attach an image directly
    from their device. Validates type + size and writes to GridFS.

    Response: {"url": "/api/uploads/events/<id>.<ext>", "name": "<original>"}
    """
    ctype = (file.content_type or "").lower()
    ext = (Path(file.filename or "").suffix or "").lower()
    if ctype not in ALLOWED_IMAGE_MIME and ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(status_code=415, detail="Only image files are allowed")
    if not ext:
        ext = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }.get(ctype, ".jpg")
    if not ctype:
        ctype = MIME_FOR_EXT.get(ext, "application/octet-stream")

    body = await file.read()
    if len(body) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 6 MB)")

    filename = f"{uuid.uuid4().hex}{ext}"
    await _bucket().upload_from_stream(
        filename,
        body,
        metadata={"content_type": ctype, "original_name": file.filename or filename},
    )
    return {"url": _public_upload_url(filename), "name": file.filename or filename}


@api_router.get("/uploads/events/{filename}")
async def serve_event_image(filename: str):
    """Stream an image stored in GridFS. Cached aggressively client-side because
    filenames are immutable (uuid-based)."""
    cur = db["event_images.files"].find_one({"filename": filename}, {"_id": 1, "metadata": 1})
    doc = await cur if hasattr(cur, "__await__") else cur
    if not doc:
        raise HTTPException(status_code=404, detail="Image not found")
    ctype = (doc.get("metadata") or {}).get("content_type") or MIME_FOR_EXT.get(
        Path(filename).suffix.lower(), "application/octet-stream"
    )
    stream = await _bucket().open_download_stream_by_name(filename)
    data = await stream.read()
    return Response(
        content=data,
        media_type=ctype,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@api_router.post("/uploads/event-programs", status_code=201)
async def upload_event_program(file: UploadFile = File(...)):
    """Public upload — event submitter or admin can attach a PDF programme.
    Validates content-type + size and writes to GridFS bucket `event_programs`.

    Response: {"url": "/api/uploads/event-programs/<id>.pdf", "name": "<original>"}
    """
    ctype = (file.content_type or "").lower()
    ext = (Path(file.filename or "").suffix or "").lower()
    if ctype != "application/pdf" and ext != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDF files are allowed")

    body = await file.read()
    if len(body) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(body) > MAX_PROGRAM_BYTES:
        raise HTTPException(status_code=413, detail="PDF too large (max 10 MB)")

    filename = f"{uuid.uuid4().hex}.pdf"
    bucket = AsyncIOMotorGridFSBucket(db, bucket_name="event_programs")
    await bucket.upload_from_stream(
        filename,
        body,
        metadata={"content_type": "application/pdf", "original_name": file.filename or filename},
    )
    return {
        "url": f"/api/uploads/event-programs/{filename}",
        "name": file.filename or filename,
    }


@api_router.get("/uploads/event-programs/{filename}")
async def serve_event_program(filename: str):
    """Stream a PDF stored in GridFS. Cache aggressively (filenames immutable)."""
    cur = db["event_programs.files"].find_one({"filename": filename}, {"_id": 1, "metadata": 1})
    doc = await cur if hasattr(cur, "__await__") else cur
    if not doc:
        raise HTTPException(status_code=404, detail="Program PDF not found")
    bucket = AsyncIOMotorGridFSBucket(db, bucket_name="event_programs")
    stream = await bucket.open_download_stream_by_name(filename)
    data = await stream.read()
    original = (doc.get("metadata") or {}).get("original_name") or filename
    return Response(
        content=data,
        media_type="application/pdf",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Disposition": f'inline; filename="{original}"',
        },
    )


@api_router.get("/admin/uploads/events")
async def list_uploaded_images(_admin: dict = Depends(get_admin_user)):
    """Admin-only image library. Lists every image stored in GridFS so the admin
    can re-attach an existing image to a new event from a picker."""
    files = []
    cursor = db["event_images.files"].find(
        {}, {"filename": 1, "length": 1, "uploadDate": 1, "metadata": 1, "_id": 0}
    ).sort("uploadDate", -1)
    async for d in cursor:
        files.append({
            "url": _public_upload_url(d["filename"]),
            "name": (d.get("metadata") or {}).get("original_name") or d["filename"],
            "size": d.get("length", 0),
            "mtime": d.get("uploadDate").timestamp() if d.get("uploadDate") else 0,
        })
    return files


@api_router.post("/events", response_model=EventOut, status_code=201)
async def submit_event(payload: EventCreate, background: BackgroundTasks):
    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "status": "pending",
        "created_at": now,
        "title_en": doc.get("title_en") or "",
        "title_sv": doc.get("title_sv") or "",
        "description_en": doc.get("description_en") or "",
        "description_sv": doc.get("description_sv") or "",
        "link": doc.get("link") or "",
        "image_url": doc.get("image_url") or "",
        "gallery": doc.get("gallery") or [],
        "country": doc.get("country") or "FI",
        "audience": doc.get("audience") or "",
        "fight_style": doc.get("fight_style") or "",
    })
    await db.events.insert_one(doc)
    # Fire-and-forget admin notification
    background.add_task(notify_admin_new_event, _serialize_event(doc))
    # Fill missing translations in the background
    background.add_task(fill_missing_translations, db, doc["id"])
    return EventOut(**_serialize_event(doc))


@api_router.get("/events", response_model=List[EventOut])
async def list_events(
    category: Optional[EventCategory] = None,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    include_past: bool = False,
):
    q: dict = {"status": "approved"}
    if category:
        q["category"] = category
    if from_date or to_date:
        date_q: dict = {}
        if from_date:
            date_q["$gte"] = from_date
        if to_date:
            date_q["$lte"] = to_date
        q["start_date"] = date_q
    docs = await db.events.find(q, {"_id": 0}).sort("start_date", 1).to_list(2000)
    if not include_past:
        today = datetime.now(timezone.utc).date().isoformat()
        docs = [d for d in docs if (d.get("end_date") or d.get("start_date") or "") >= today]
    return [EventOut(**d) for d in docs]


@api_router.get("/events/{event_id}", response_model=EventOut)
async def get_event(event_id: str):
    doc = await db.events.find_one({"id": event_id, "status": "approved"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventOut(**doc)


# -----------------------------------------------------------------------------
# iCal feed (public)
# -----------------------------------------------------------------------------
def _ical_escape(s: str) -> str:
    return (
        (s or "")
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def _to_ical_date(iso_date: str) -> str:
    return iso_date.replace("-", "")


@api_router.get("/events.ics")
async def events_ical():
    docs = await db.events.find({"status": "approved"}, {"_id": 0}).sort("start_date", 1).to_list(2000)
    today = datetime.now(timezone.utc).date().isoformat()
    docs = [d for d in docs if (d.get("end_date") or d.get("start_date") or "") >= today]
    site = os.environ.get("PUBLIC_SITE_URL", "").rstrip("/")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Viikinkitapahtumat//FI",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Viikinkitapahtumat",
        "X-WR-TIMEZONE:Europe/Helsinki",
    ]
    for d in docs:
        try:
            start = _to_ical_date(d["start_date"])
            end_raw = d.get("end_date") or d["start_date"]
            end_dt = (datetime.fromisoformat(end_raw) + timedelta(days=1)).date().isoformat()
            end = _to_ical_date(end_dt)
        except Exception:  # noqa: BLE001
            continue
        url = f"{site}/events/{d['id']}" if site else ""
        summary = _ical_escape(d.get("title_fi") or "")
        location = _ical_escape(d.get("location") or "")
        desc_parts = []
        if d.get("description_fi"):
            desc_parts.append(d["description_fi"])
        if d.get("organizer"):
            desc_parts.append(f"Järjestäjä: {d['organizer']}")
        if url:
            desc_parts.append(url)
        description = _ical_escape("\n\n".join(desc_parts))
        dtstamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        lines += [
            "BEGIN:VEVENT",
            f"UID:{d['id']}@viikinkitapahtumat.fi",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART;VALUE=DATE:{start}",
            f"DTEND;VALUE=DATE:{end}",
            f"SUMMARY:{summary}",
            f"LOCATION:{location}",
            f"DESCRIPTION:{description}",
        ]
        if url:
            lines.append(f"URL:{url}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    body = "\r\n".join(lines) + "\r\n"
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'inline; filename="viikinkitapahtumat.ics"'},
    )


# -----------------------------------------------------------------------------
# Newsletter routes (public)
# -----------------------------------------------------------------------------
@api_router.post("/newsletter/subscribe")
async def subscribe(payload: SubscribeRequest, background: BackgroundTasks):
    email = payload.email.lower()
    existing = await db.newsletter_subscribers.find_one({"email": email})
    if existing and existing.get("status") == "active":
        return {"ok": True, "already": True}
    token = make_unsubscribe_token()
    doc = {
        "id": existing.get("id") if existing else str(uuid.uuid4()),
        "email": email,
        "lang": payload.lang or "fi",
        "status": "active",
        "unsubscribe_token": token,
        "created_at": existing.get("created_at") if existing else datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.newsletter_subscribers.update_one(
        {"email": email},
        {"$set": doc},
        upsert=True,
    )
    background.add_task(send_subscribe_confirmation, email, token)
    return {"ok": True}


@api_router.get("/newsletter/unsubscribe")
async def unsubscribe(token: str):
    res = await db.newsletter_subscribers.update_one(
        {"unsubscribe_token": token},
        {"$set": {"status": "unsubscribed", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    site = os.environ.get("PUBLIC_SITE_URL", "").rstrip("/")
    target = f"{site}/?unsub={'ok' if res.modified_count else 'invalid'}" if site else "/"
    return RedirectResponse(url=target, status_code=303)


# -----------------------------------------------------------------------------
# Event reminders (public)
# -----------------------------------------------------------------------------
@api_router.post("/events/{event_id}/remind")
async def request_event_reminder(
    event_id: str, payload: ReminderRequest, background: BackgroundTasks
):
    ev = await db.events.find_one({"id": event_id, "status": "approved"}, {"_id": 0})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    email = payload.email.lower()
    existing = await db.event_reminders.find_one({"event_id": event_id, "email": email})
    if existing and existing.get("status") == "active":
        return {"ok": True, "already": True}
    token = make_unsubscribe_token()
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": existing.get("id") if existing else str(uuid.uuid4()),
        "event_id": event_id,
        "email": email,
        "lang": payload.lang or "fi",
        "status": "active",
        "unsubscribe_token": token,
        "created_at": existing.get("created_at") if existing else now,
        "updated_at": now,
        "sent_at": None,
    }
    await db.event_reminders.update_one(
        {"event_id": event_id, "email": email},
        {"$set": doc},
        upsert=True,
    )
    background.add_task(svc_send_reminder_confirmation, ev, email, token)
    return {"ok": True}


@api_router.get("/reminders/unsubscribe")
async def unsubscribe_reminder(token: str):
    res = await db.event_reminders.update_one(
        {"unsubscribe_token": token},
        {"$set": {"status": "unsubscribed", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    site = os.environ.get("PUBLIC_SITE_URL", "").rstrip("/")
    target = f"{site}/?reminder_unsub={'ok' if res.modified_count else 'invalid'}" if site else "/"
    return RedirectResponse(url=target, status_code=303)


# -----------------------------------------------------------------------------
# Admin event routes
# -----------------------------------------------------------------------------
@api_router.get("/admin/events", response_model=List[EventOut])
async def admin_list_events(
    status: str = "pending",
    _admin: dict = Depends(get_admin_user),
):
    q: dict = {} if status == "all" else {"status": status}
    docs = await db.events.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [EventOut(**d) for d in docs]


@api_router.get("/admin/events/{event_id}", response_model=EventOut)
async def admin_get_event(event_id: str, _admin: dict = Depends(get_admin_user)):
    doc = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventOut(**doc)


@api_router.patch("/admin/events/{event_id}", response_model=EventOut)
async def admin_update_status(
    event_id: str,
    payload: EventStatusUpdate,
    background: BackgroundTasks,
    _admin: dict = Depends(get_admin_user),
):
    res = await db.events.find_one_and_update(
        {"id": event_id},
        {"$set": {"status": payload.status, "reviewed_at": datetime.now(timezone.utc).isoformat()}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Event not found")
    if payload.status in ("approved", "rejected"):
        background.add_task(notify_submitter_decision, res, payload.status == "approved")
    return EventOut(**res)


@api_router.delete("/admin/events/{event_id}")
async def admin_delete_event(event_id: str, _admin: dict = Depends(get_admin_user)):
    res = await db.events.delete_one({"id": event_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"ok": True}


@api_router.put("/admin/events/{event_id}", response_model=EventOut)
async def admin_edit_event(
    event_id: str,
    payload: EventEdit,
    background: BackgroundTasks,
    _admin: dict = Depends(get_admin_user),
):
    update_doc = payload.model_dump()
    # Normalise empty string-or-null defaults
    for k in ("title_en", "title_sv", "description_en", "description_sv", "link", "image_url", "audience", "fight_style"):
        update_doc[k] = update_doc.get(k) or ""
    update_doc["gallery"] = update_doc.get("gallery") or []
    update_doc["country"] = update_doc.get("country") or "FI"
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.events.find_one_and_update(
        {"id": event_id},
        {"$set": update_doc},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Event not found")
    # Fill any newly-empty translations in the background
    background.add_task(fill_missing_translations, db, event_id)
    return EventOut(**res)


# -----------------------------------------------------------------------------
# Merchants & Guilds (public read + admin write)
# -----------------------------------------------------------------------------
def _strip(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.get("/merchants", response_model=List[MerchantOut])
async def list_merchants():
    docs = await db.merchants.find({}, {"_id": 0}).sort([("category", 1), ("order_index", 1), ("name", 1)]).to_list(2000)
    return [MerchantOut(**_normalize_merchant(d)) for d in docs]


def _normalize_merchant(d: dict) -> dict:
    return {
        "id": d.get("id"),
        "name": d.get("name") or "",
        "description": d.get("description") or "",
        "url": d.get("url") or "",
        "category": d.get("category") or "gear",
        "order_index": d.get("order_index") or 0,
    }


def _normalize_guild(d: dict) -> dict:
    return {
        "id": d.get("id"),
        "name": d.get("name") or "",
        "region": d.get("region") or "",
        "url": d.get("url") or "",
        "category": d.get("category") or "other",
        "order_index": d.get("order_index") or 0,
    }


@api_router.get("/guilds", response_model=List[GuildOut])
async def list_guilds():
    docs = await db.guilds.find({}, {"_id": 0}).sort([("category", 1), ("order_index", 1), ("name", 1)]).to_list(2000)
    return [GuildOut(**_normalize_guild(d)) for d in docs]


@api_router.post("/admin/merchants", response_model=MerchantOut, status_code=201)
async def admin_create_merchant(payload: MerchantIn, _admin: dict = Depends(get_admin_user)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.merchants.insert_one(doc)
    return MerchantOut(**_normalize_merchant(doc))


@api_router.put("/admin/merchants/{mid}", response_model=MerchantOut)
async def admin_update_merchant(mid: str, payload: MerchantIn, _admin: dict = Depends(get_admin_user)):
    res = await db.merchants.find_one_and_update(
        {"id": mid},
        {"$set": {**payload.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return MerchantOut(**_normalize_merchant(res))


@api_router.delete("/admin/merchants/{mid}")
async def admin_delete_merchant(mid: str, _admin: dict = Depends(get_admin_user)):
    res = await db.merchants.delete_one({"id": mid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return {"ok": True}


@api_router.post("/admin/guilds", response_model=GuildOut, status_code=201)
async def admin_create_guild(payload: GuildIn, _admin: dict = Depends(get_admin_user)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.guilds.insert_one(doc)
    return GuildOut(**_normalize_guild(doc))


@api_router.put("/admin/guilds/{gid}", response_model=GuildOut)
async def admin_update_guild(gid: str, payload: GuildIn, _admin: dict = Depends(get_admin_user)):
    res = await db.guilds.find_one_and_update(
        {"id": gid},
        {"$set": {**payload.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Guild not found")
    return GuildOut(**_normalize_guild(res))


@api_router.delete("/admin/guilds/{gid}")
async def admin_delete_guild(gid: str, _admin: dict = Depends(get_admin_user)):
    res = await db.guilds.delete_one({"id": gid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Guild not found")
    return {"ok": True}


@api_router.get("/admin/stats")
async def admin_stats(_admin: dict = Depends(get_admin_user)):
    pending = await db.events.count_documents({"status": "pending"})
    approved = await db.events.count_documents({"status": "approved"})
    rejected = await db.events.count_documents({"status": "rejected"})
    subscribers = await db.newsletter_subscribers.count_documents({"status": "active"})
    return {"pending": pending, "approved": approved, "rejected": rejected, "subscribers": subscribers}


@api_router.post("/admin/newsletter/send")
async def admin_send_newsletter(_admin: dict = Depends(get_admin_user)):
    return await svc_send_monthly_digest(db, days=60)


@api_router.post("/admin/weekly-report/send")
async def admin_send_weekly_report(_admin: dict = Depends(get_admin_user)):
    return await svc_send_weekly_admin_report(db)


@api_router.get("/admin/weekly-report/preview")
async def admin_preview_weekly_report(_admin: dict = Depends(get_admin_user)):
    from email_service import render_weekly_admin_report, select_upcoming_events
    pending_count = await db.events.count_documents({"status": "pending"})
    approved_count = await db.events.count_documents({"status": "approved"})
    rejected_count = await db.events.count_documents({"status": "rejected"})
    sub_count = await db.newsletter_subscribers.count_documents({"status": "active"})
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_subs = await db.newsletter_subscribers.count_documents({"status": "active", "created_at": {"$gte": week_ago}})
    pending = await db.events.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    approved = await db.events.find({"status": "approved"}, {"_id": 0}).to_list(2000)
    upcoming = select_upcoming_events(approved, days=30)
    stats = {"pending": pending_count, "approved": approved_count, "rejected": rejected_count, "subscribers": sub_count}
    subject, html = render_weekly_admin_report(stats, pending, upcoming, new_subs)
    return {"subject": subject, "html": html, "stats": stats, "new_subs": new_subs}


@api_router.get("/admin/newsletter/preview")
async def admin_preview_newsletter(_admin: dict = Depends(get_admin_user)):
    """Return the digest body so admin can preview before sending."""
    from email_service import render_monthly_digest, select_upcoming_events, unsubscribe_url as _uurl
    events = await db.events.find({"status": "approved"}, {"_id": 0}).to_list(2000)
    upcoming = select_upcoming_events(events, days=60)
    subject, html = render_monthly_digest(upcoming, _uurl("PREVIEW"))
    return {"subject": subject, "html": html, "count": len(upcoming)}


@api_router.get("/admin/subscribers")
async def admin_list_subscribers(_admin: dict = Depends(get_admin_user)):
    docs = await db.newsletter_subscribers.find(
        {}, {"_id": 0, "unsubscribe_token": 0}
    ).sort("created_at", -1).to_list(10000)
    return docs


@api_router.delete("/admin/subscribers/{email}", status_code=204)
async def admin_delete_subscriber(email: str, _admin: dict = Depends(get_admin_user)):
    """Hard-delete a newsletter subscriber by email. Returns 404 if not found."""
    res = await db.newsletter_subscribers.delete_one({"email": email.lower().strip()})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return Response(status_code=204)


class ContactPayload(BaseModel):
    name: str
    email: EmailStr
    message: str
    source: Optional[str] = "mobile-app"


@api_router.post("/contact", status_code=201)
async def submit_contact(payload: ContactPayload):
    """Public endpoint — anyone (esp. mobile beta testers) can send a
    feedback / contact message. Persists to `contact_messages` and emails
    the admin via Resend if configured. Length limits prevent abuse."""
    name = payload.name.strip()[:120]
    msg = payload.message.strip()[:4000]
    if not name or len(msg) < 5:
        raise HTTPException(status_code=400, detail="Name and message required")

    record = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": str(payload.email).lower(),
        "message": msg,
        "source": (payload.source or "mobile-app")[:40],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contact_messages.insert_one(record)

    # Email admin (best-effort — never fail the request if Resend is down)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@viikinkitapahtumat.fi")
    safe_msg = msg.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    html = (
        f"<h2 style='font-family:serif'>Uusi yhteydenotto sovelluksesta</h2>"
        f"<p><strong>Lähde:</strong> {record['source']}</p>"
        f"<p><strong>Nimi:</strong> {name}<br>"
        f"<strong>Sähköposti:</strong> <a href='mailto:{record['email']}'>{record['email']}</a></p>"
        f"<hr><p style='font-family:sans-serif;line-height:1.5'>{safe_msg}</p>"
    )
    try:
        from email_service import send_email
        await send_email(admin_email, f"Yhteydenotto: {name}", html)
        record["email_sent"] = True
    except Exception as e:  # noqa: BLE001
        logger.warning("Contact email send failed: %s", e)
        record["email_sent"] = False
    return {"ok": True, "id": record["id"], "email_sent": record["email_sent"]}


@api_router.post("/admin/sync-prod-events")
async def admin_sync_prod_events(_admin: dict = Depends(get_admin_user)):
    """Manually trigger the prod → preview events sync. Returns count."""
    try:
        from scripts.sync_prod_events import main as sync_main
        await sync_main()
        total = await db.events.count_documents({})
        return {"ok": True, "events_in_db": total}
    except Exception as e:  # noqa: BLE001
        logger.exception("Manual prod sync failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Sync failed: {e}")


# -----------------------------------------------------------------------------
# Health
# -----------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Viikinkitapahtumat API", "version": "1.1.0"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


# -----------------------------------------------------------------------------
# Scheduler — monthly digest
# -----------------------------------------------------------------------------
scheduler: Optional[AsyncIOScheduler] = None


async def _scheduled_monthly_digest():
    try:
        result = await svc_send_monthly_digest(db, days=60)
        logger.info("Monthly digest sent: %s", result)
    except Exception as e:  # noqa: BLE001
        logger.exception("Monthly digest failed: %s", e)


async def _scheduled_weekly_admin_report():
    try:
        result = await svc_send_weekly_admin_report(db)
        logger.info("Weekly admin report sent: %s", result)
    except Exception as e:  # noqa: BLE001
        logger.exception("Weekly admin report failed: %s", e)


async def _scheduled_event_reminders():
    try:
        result = await svc_send_event_reminders(db, days_ahead=7)
        logger.info("Event reminders sent: %s", result)
    except Exception as e:  # noqa: BLE001
        logger.exception("Event reminders failed: %s", e)


async def _scheduled_prod_events_sync():
    """Refresh preview/test DB events from production twice a day."""
    try:
        from scripts.sync_prod_events import main as sync_main
        await sync_main()
        logger.info("Prod → preview events sync completed")
    except Exception as e:  # noqa: BLE001
        logger.exception("Prod → preview events sync failed: %s", e)


# -----------------------------------------------------------------------------
# Startup
# -----------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    global scheduler
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.events.create_index("id", unique=True)
    await db.events.create_index("status")
    await db.events.create_index("start_date")
    await db.newsletter_subscribers.create_index("email", unique=True)
    await db.newsletter_subscribers.create_index("unsubscribe_token")
    await db.event_reminders.create_index([("event_id", 1), ("email", 1)], unique=True)
    await db.event_reminders.create_index("unsubscribe_token")
    await db.event_reminders.create_index("status")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@viikinkitapahtumat.fi").lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin user seeded: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )

    # Auto-seed merchants / guilds taxonomy on first startup of an empty DB.
    # Idempotent: only runs when collections are empty so manual edits aren't
    # overwritten on subsequent restarts.
    try:
        if await db.merchants.estimated_document_count() == 0:
            from scripts.seed_taxonomy import seed_taxonomy
            res = await seed_taxonomy(db)
            logger.info("Auto-seeded merchants/guilds: %s", res)
        elif await db.guilds.estimated_document_count() == 0:
            from scripts.seed_taxonomy import seed_taxonomy
            res = await seed_taxonomy(db)
            logger.info("Auto-seeded merchants/guilds (guilds were empty): %s", res)
    except Exception as e:  # noqa: BLE001
        logger.exception("Taxonomy auto-seed failed: %s", e)

    # APScheduler — 1st of every month at 09:00 Europe/Helsinki
    scheduler = AsyncIOScheduler(timezone=pytz.timezone("Europe/Helsinki"))
    scheduler.add_job(
        _scheduled_monthly_digest,
        CronTrigger(day=1, hour=9, minute=0),
        id="monthly_digest",
        replace_existing=True,
    )
    scheduler.add_job(
        _scheduled_weekly_admin_report,
        CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="weekly_admin_report",
        replace_existing=True,
    )
    scheduler.add_job(
        _scheduled_event_reminders,
        CronTrigger(hour=9, minute=0),
        id="event_reminders_daily",
        replace_existing=True,
    )
    # NEW: Daily push + email reminders for users who RSVPed to upcoming
    # events with notify_push / notify_email = true.
    scheduler.add_job(
        _run_daily_event_reminders,
        CronTrigger(hour=9, minute=15),
        id="rsvp_reminders_daily",
        replace_existing=True,
    )
    # Sync events from production into preview/test DB twice daily — 06:00 + 18:00 Europe/Helsinki.
    # Only enabled when the env flag opts in (the production deployment must NOT pull from itself).
    if os.environ.get("PROD_SYNC_ENABLED", "true").lower() in ("1", "true", "yes"):
        scheduler.add_job(
            _scheduled_prod_events_sync,
            CronTrigger(hour="6,18", minute=0),
            id="prod_events_sync",
            replace_existing=True,
        )
    scheduler.start()
    logger.info(
        "APScheduler started — monthly digest 1st@09:00, weekly admin report Mon@09:00, "
        "event reminders daily@09:00, prod events sync 06:00+18:00, Europe/Helsinki"
    )


@app.on_event("shutdown")
async def shutdown_db_client():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
    client.close()


# Include router
app.include_router(api_router)

# -----------------------------------------------------------------------------
# Mobile app web build (Expo export served via /api ingress)
# -----------------------------------------------------------------------------
_MOBILE_DIST = Path("/app/mobile/dist")

# AI-generated viking event images live in the frontend public folder. Mount
# them under /api/events-images/* so mobile clients can load them same-origin
# (avoids ORB / mixed-content / external CDN issues with the original
# viikinkitapahtumat.fi/pics/*.jpg URLs which now return HTML).
_EVENTS_IMG_DIR = Path("/app/frontend/public/event-images")
if _EVENTS_IMG_DIR.exists():
    app.mount(
        "/api/events-images",
        StaticFiles(directory=str(_EVENTS_IMG_DIR)),
        name="events-images",
    )

if _MOBILE_DIST.exists() and (_MOBILE_DIST / "index.html").exists():
    # Mount static assets (real files: _expo/, assets/, metadata.json) under /api/mobile-app.
    # We deliberately do NOT use html=True here so that 404s bubble up to the SPA fallback below.
    app.mount(
        "/api/mobile-app/static",
        StaticFiles(directory=str(_MOBILE_DIST)),
        name="mobile-app-static",
    )

    # SPA fallback: index.html for the root and any client-side route. Static assets
    # under /api/mobile-app/_expo/* and /api/mobile-app/assets/* are handled separately.
    @app.get("/api/mobile-app", include_in_schema=False)
    @app.get("/api/mobile-app/", include_in_schema=False)
    @app.get("/api/mobile-app/{full_path:path}", include_in_schema=False)
    async def _mobile_app_spa(full_path: str = ""):
        # Real file on disk? Serve it.
        if full_path:
            candidate = (_MOBILE_DIST / full_path).resolve()
            try:
                candidate.relative_to(_MOBILE_DIST.resolve())
            except ValueError:
                # Path traversal attempt — fall through to index.html
                candidate = None
            if candidate and candidate.is_file():
                return FileResponse(candidate)
        # Otherwise serve index.html for SPA client-side routing.
        return FileResponse(_MOBILE_DIST / "index.html")

# CORS: when credentials are required (cookies), browsers reject `Access-Control-Allow-Origin: *`.
# Therefore we configure the middleware to echo the request origin via allow_origin_regex
# whenever CORS_ORIGINS is unset or "*". For production, set CORS_ORIGINS to a comma-separated
# list of exact origins.
_cors_origins_raw = os.environ.get("CORS_ORIGINS", "*").strip()
if _cors_origins_raw in ("", "*"):
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origin_regex=".*",
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=[o.strip() for o in _cors_origins_raw.split(",") if o.strip()],
        allow_methods=["*"],
        allow_headers=["*"],
    )

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
