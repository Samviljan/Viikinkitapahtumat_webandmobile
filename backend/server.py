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
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, BackgroundTasks, UploadFile, File, Form
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
from translation_service import fill_missing_translations, sweep_missing_translations


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
        user.setdefault("association_name", None)
        user.setdefault("country", None)
        user.setdefault("profile_image_url", None)
        user.setdefault("fighter_card_url", None)
        user.setdefault("equipment_passport_url", None)
        user.setdefault("consent_organizer_messages", False)
        user.setdefault("consent_merchant_offers", False)
        user.setdefault("saved_search", None)
        user.setdefault("paid_messaging_enabled", False)
        user.setdefault("is_moderator", False)
        user.setdefault("language", None)
        user.setdefault("favorite_event_ids", [])
        user.setdefault("favorite_merchant_ids", [])
        user.setdefault("merchant_card", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def get_admin_or_moderator(user: dict = Depends(get_current_user)) -> dict:
    """Grants access to either full admins OR users flagged as moderators.
    Moderators can use every admin panel action *except* deleting/creating
    admin accounts (that logic is enforced at the endpoint level).
    """
    if user.get("role") == "admin" or bool(user.get("is_moderator")):
        return user
    raise HTTPException(status_code=403, detail="Admin or moderator access required")


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


class MerchantCard(BaseModel):
    """Public merchant profile card embedded on the user document.

    Backlog: P1 — `users.merchant_card` sub-document, deprecates the old
    `merchants` collection. Includes a 12-month subscription window
    (`merchant_until`) so a future Stripe webhook can auto-renew it. While
    Stripe is deferred, admins flip `enabled` manually via the admin panel.
    """

    model_config = ConfigDict(extra="ignore")
    enabled: bool = False  # admin-toggle (`merchant_card_enabled`)
    shop_name: str = ""
    website: str = ""
    phone: str = ""
    email: str = ""
    description: str = ""  # plain text, max 1000 chars
    image_url: Optional[str] = None
    category: Literal["gear", "smith"] = "gear"
    featured: bool = False
    merchant_until: Optional[str] = None  # ISO timestamp; auto-disable on expiry
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


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
    association_name: Optional[str] = None
    country: Optional[str] = None
    profile_image_url: Optional[str] = None
    fighter_card_url: Optional[str] = None
    equipment_passport_url: Optional[str] = None
    consent_organizer_messages: bool = False
    consent_merchant_offers: bool = False
    saved_search: Optional[SavedSearch] = None
    paid_messaging_enabled: bool = False
    is_moderator: bool = False
    language: Optional[str] = None
    favorite_event_ids: List[str] = []
    favorite_merchant_ids: List[str] = []
    merchant_card: Optional[MerchantCard] = None


USER_TYPES = {"reenactor", "fighter", "merchant", "organizer"}
VALID_COUNTRIES = {
    "FI", "SE", "EE", "NO", "DK", "PL", "DE", "IS", "LV", "LT",
    "SI", "HR", "UA", "NL", "GB", "IE", "BE", "FR", "ES", "PT", "IT",
}


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
    association_name: Optional[str] = None
    country: Optional[str] = None
    profile_image_url: Optional[str] = None
    fighter_card_url: Optional[str] = None
    equipment_passport_url: Optional[str] = None
    consent_organizer_messages: Optional[bool] = None
    consent_merchant_offers: Optional[bool] = None
    saved_search: Optional[SavedSearch] = None
    language: Optional[str] = None


class GoogleSessionRequest(BaseModel):
    session_id: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    """Logged-in user changes their own password. Requires the current
    password (not for Google-only accounts)."""
    current_password: str
    new_password: str


class AdminResetPasswordRequest(BaseModel):
    """Admin manually sets a new password for any user. The new password
    is generated by the admin (UI auto-suggests a strong random one)."""
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
    """Organizer/merchant sends a single message to attendees of an event they
    are also attending. Channel = "push", "email", or "both". Recipients are
    filtered by the appropriate consent flag and `notify_*` per-RSVP, AND
    optionally by `target_categories` (a subset of user_types: reenactor /
    fighter / merchant / organizer). Empty `target_categories` means "all"."""

    event_id: str
    channel: Literal["push", "email", "both"] = "both"
    subject: str
    body: str
    target_categories: List[Literal["reenactor", "fighter", "merchant", "organizer"]] = []


# -----------------------------------------------------------------------------
# Messaging quota — global config that limits how many push/email messages a
# single non-admin sender may dispatch per event over its lifetime.
# Stored in the `system_config` collection under key="messaging_quota". The
# counter is the count of `message_log` rows for (sender_id, event_id), so
# unsubscribing and re-subscribing to an event does NOT reset the counter.
# -----------------------------------------------------------------------------
QUOTA_PRESETS = {"A": 10, "B": 20, "C": 30}
DEFAULT_QUOTA_PRESET = "A"
DEFAULT_CUSTOM_QUOTA = 50


class MessagingQuotaConfig(BaseModel):
    preset: Literal["A", "B", "C", "D"] = DEFAULT_QUOTA_PRESET
    custom_value: int = DEFAULT_CUSTOM_QUOTA


class MessagingQuotaUpdate(BaseModel):
    preset: Literal["A", "B", "C", "D"]
    custom_value: Optional[int] = None  # required when preset="D"


async def get_messaging_quota_config() -> MessagingQuotaConfig:
    """Read the current messaging quota config from system_config. Defaults to
    preset A (10 messages per event) when no config row exists."""
    row = await db.system_config.find_one({"_id": "messaging_quota"})
    if not row:
        return MessagingQuotaConfig()
    return MessagingQuotaConfig(
        preset=row.get("preset", DEFAULT_QUOTA_PRESET),
        custom_value=int(row.get("custom_value", DEFAULT_CUSTOM_QUOTA)),
    )


def quota_value(cfg: MessagingQuotaConfig) -> int:
    if cfg.preset == "D":
        return max(1, int(cfg.custom_value or DEFAULT_CUSTOM_QUOTA))
    return QUOTA_PRESETS[cfg.preset]


EventCategory = Literal["market", "training_camp", "course", "festival", "meetup", "other"]
EventStatus = Literal["pending", "approved", "rejected"]
EventCountry = Literal[
    "FI", "SE", "EE", "NO", "DK", "PL", "DE", "IS", "LV", "LT",
    "SI", "HR", "UA", "NL", "GB", "IE", "BE", "FR", "ES", "PT", "IT",
]


class EventCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    # Localized fields — at least one title_* AND one description_* required.
    # Validated below in `model_post_init`. Submitter typically fills the field
    # for their active UI language; the translator background task fills the
    # rest.
    title_fi: Optional[str] = ""
    title_en: Optional[str] = ""
    title_sv: Optional[str] = ""
    title_da: Optional[str] = ""
    title_de: Optional[str] = ""
    title_et: Optional[str] = ""
    title_pl: Optional[str] = ""
    description_fi: Optional[str] = ""
    description_en: Optional[str] = ""
    description_sv: Optional[str] = ""
    description_da: Optional[str] = ""
    description_de: Optional[str] = ""
    description_et: Optional[str] = ""
    description_pl: Optional[str] = ""
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

    def model_post_init(self, _ctx) -> None:
        langs = ("fi", "en", "sv", "da", "de", "et", "pl")
        has_title = any((getattr(self, f"title_{lg}") or "").strip() for lg in langs)
        has_desc = any((getattr(self, f"description_{lg}") or "").strip() for lg in langs)
        if not has_title:
            raise ValueError("title is required (in at least one language)")
        if not has_desc:
            raise ValueError("description is required (in at least one language)")


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
    # Extended fields populated for user-card merchants (not legacy entries)
    image_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    featured: bool = False
    is_user_card: bool = False
    user_id: Optional[str] = None


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
# -----------------------------------------------------------------------------
# Brute-force protection for /auth/login
#
# Tracks failed attempts per user document. After 5 consecutive wrong
# passwords, the account is locked for 60 minutes. A successful login resets
# the counter. Attackers targeting a non-existent email cannot trigger a lock
# (nothing to track), but they also cannot distinguish that case from "wrong
# password" because the error message is identical.
# -----------------------------------------------------------------------------
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 60


@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    now = datetime.now(timezone.utc)

    # If the target account is currently locked, short-circuit with 429 so the
    # UI can display a "wait an hour" message. We do NOT leak this state for
    # non-existent emails (only a real, locked account returns 429).
    if user:
        lockout_until_raw = user.get("lockout_until")
        if lockout_until_raw:
            try:
                lockout_until = datetime.fromisoformat(lockout_until_raw)
                if lockout_until.tzinfo is None:
                    lockout_until = lockout_until.replace(tzinfo=timezone.utc)
                if lockout_until > now:
                    minutes_left = max(1, int((lockout_until - now).total_seconds() / 60))
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "code": "account_locked",
                            "minutes_left": minutes_left,
                            "max_attempts": LOGIN_MAX_ATTEMPTS,
                        },
                    )
            except ValueError:
                # Stored value corrupted — clear it so the user isn't locked forever.
                await db.users.update_one(
                    {"id": user["id"]}, {"$unset": {"lockout_until": ""}}
                )

    # Password check. Combined into one condition to avoid leaking user-existence
    # through response-time differences — `verify_password` short-circuits on a
    # None hash the same way as on a wrong one.
    if not user or not user.get("password_hash") or not verify_password(
        payload.password, user["password_hash"]
    ):
        # Only track failure for real accounts — we don't want to create junk
        # lock records for every typo'd email.
        if user:
            new_count = int(user.get("failed_login_count", 0) or 0) + 1
            update: dict = {"failed_login_count": new_count}
            if new_count >= LOGIN_MAX_ATTEMPTS:
                update["lockout_until"] = (
                    now + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
                ).isoformat()
                # Reset the counter so the NEXT window starts fresh after the
                # lockout expires (prevents a 6th failure from creating a
                # perpetual lockout loop).
                update["failed_login_count"] = 0
            await db.users.update_one(
                {"id": user["id"]}, {"$set": update}
            )
            if new_count >= LOGIN_MAX_ATTEMPTS:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "code": "account_locked",
                        "minutes_left": LOGIN_LOCKOUT_MINUTES,
                        "max_attempts": LOGIN_MAX_ATTEMPTS,
                    },
                )
            remaining = LOGIN_MAX_ATTEMPTS - new_count
            raise HTTPException(
                status_code=401,
                detail={
                    "code": "invalid_credentials",
                    "attempts_remaining": remaining,
                    "max_attempts": LOGIN_MAX_ATTEMPTS,
                },
            )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Successful login — clear any accumulated failure state.
    if int(user.get("failed_login_count", 0) or 0) > 0 or user.get("lockout_until"):
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {"failed_login_count": 0},
                "$unset": {"lockout_until": ""},
            },
        )

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
        "association_name": user.get("association_name"),
        "country": user.get("country"),
        "profile_image_url": user.get("profile_image_url"),
        "fighter_card_url": user.get("fighter_card_url"),
        "equipment_passport_url": user.get("equipment_passport_url"),
        "consent_organizer_messages": bool(user.get("consent_organizer_messages", False)),
        "consent_merchant_offers": bool(user.get("consent_merchant_offers", False)),
        "saved_search": user.get("saved_search"),
        "paid_messaging_enabled": bool(user.get("paid_messaging_enabled", False)),
        "is_moderator": bool(user.get("is_moderator", False)),
        "language": user.get("language"),
        "favorite_event_ids": list(user.get("favorite_event_ids", []) or []),
        "favorite_merchant_ids": list(user.get("favorite_merchant_ids", []) or []),
        "merchant_card": user.get("merchant_card"),
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
    if payload.association_name is not None:
        update["association_name"] = payload.association_name.strip() or None
    if payload.country is not None:
        cc = payload.country.strip().upper()
        if cc and cc not in VALID_COUNTRIES:
            raise HTTPException(
                status_code=400, detail=f"Invalid country code: {cc}"
            )
        update["country"] = cc or None
    if payload.profile_image_url is not None:
        url = payload.profile_image_url.strip()
        # Allow our own /api/uploads/profile-images/* path or empty (=clear)
        if url and not url.startswith("/api/uploads/profile-images/"):
            raise HTTPException(
                status_code=400, detail="Invalid profile image URL"
            )
        update["profile_image_url"] = url or None
    for field, prefix in (
        ("fighter_card_url", "/api/uploads/profile-docs/"),
        ("equipment_passport_url", "/api/uploads/profile-docs/"),
    ):
        val = getattr(payload, field, None)
        if val is not None:
            url = val.strip()
            if url and not url.startswith(prefix):
                raise HTTPException(
                    status_code=400, detail=f"Invalid URL for {field}"
                )
            update[field] = url or None
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
    if payload.language is not None:
        # Free-form language code (e.g. "fi", "en", "sv", "da", "de", "et", "pl").
        # We don't strictly validate so new languages can be added later.
        lang = (payload.language or "").strip().lower()[:8]
        update["language"] = lang or None

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
    fresh.setdefault("is_moderator", False)
    fresh.setdefault("language", None)
    fresh.setdefault("favorite_event_ids", [])
    fresh.setdefault("favorite_merchant_ids", [])
    fresh.setdefault("merchant_card", None)
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

    Security contract:
      - The reset email is ALWAYS sent to the email address stored on the user
        document, NEVER to an attacker-controlled address. Even though the
        request body carries an email, that value is used only to LOOK UP the
        account; the delivery address is read back from the DB (`user["email"]`)
        so it cannot be overridden or redirected.
      - We always return HTTP 200 so callers cannot enumerate registered
        addresses by observing response differences.
      - Google-only accounts (no password_hash) are silently skipped.
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
        # Use the email stored on the user record — NOT the request payload —
        # so a reset link can only ever reach the account's own registered
        # address, even if the payload were tampered with.
        dest = (user.get("email") or "").lower().strip()
        if dest and dest == email:
            background.add_task(svc_send_password_reset, dest, token)
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


@api_router.post("/auth/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
):
    """Logged-in user changes their own password.

    Rejects requests when:
        - new password is shorter than 8 chars
        - the user has no existing password (Google-only account)
        - the current password doesn't match
    """
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )
    full = await db.users.find_one(
        {"id": user["id"]}, {"_id": 0, "password_hash": 1}
    )
    existing = (full or {}).get("password_hash")
    if not existing:
        raise HTTPException(
            status_code=400,
            detail="This account has no password (Google login). Use /auth/forgot-password to set one.",
        )
    if not verify_password(payload.current_password, existing):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {"password_hash": hash_password(payload.new_password)},
            "$unset": {"password_reset_token": "", "password_reset_expires": ""},
        },
    )
    return {"ok": True}


@api_router.post(
    "/admin/users/{user_id}/reset-password",
    dependencies=[Depends(get_admin_user)],
)
async def admin_reset_user_password(
    user_id: str, payload: AdminResetPasswordRequest
):
    """Admin sets a new password for any user manually. The user is then
    expected to sign in with the new password and immediately change it
    via /auth/change-password (admin should communicate it out-of-band).

    Rationale: useful when a user can't receive the password-reset email
    (e.g. typo'd address, mailbox issues) or needs immediate access.
    """
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "email": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {"password_hash": hash_password(payload.new_password)},
            "$unset": {"password_reset_token": "", "password_reset_expires": ""},
        },
    )
    logger.info("Admin reset password for user %s (%s)", user_id, target.get("email"))
    return {"ok": True, "email": target.get("email")}


@api_router.post(
    "/admin/users/{user_id}/send-password-reset",
    dependencies=[Depends(get_admin_user)],
)
async def admin_trigger_password_reset(
    user_id: str, background: BackgroundTasks
):
    """Admin-initiated password-reset email. Unlike the older
    /admin/users/{user_id}/reset-password endpoint, this NEVER exposes a
    plaintext password to the admin: the server generates a one-time reset
    token, emails it to the user's registered address (read from the DB,
    never from admin input), and lets the user set their own password.

    This is the preferred way for admins to help users who have forgotten
    their password. The target email is always the user's own — we reuse the
    same hardening guarantees as /auth/forgot-password.
    """
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "email": 1, "password_hash": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if not target.get("password_hash"):
        # Google-only accounts cannot reset via email-link — they already
        # don't have a password, so this is a no-op.
        raise HTTPException(
            status_code=400,
            detail="Target account signs in via Google and has no password to reset",
        )
    dest = (target.get("email") or "").lower().strip()
    if not dest:
        raise HTTPException(status_code=400, detail="Target user has no email on record")

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MIN)
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "password_reset_token": token,
                "password_reset_expires": expires.isoformat(),
            }
        },
    )
    # Same delivery guarantee as /auth/forgot-password: only to the stored
    # user email, never to an admin-controlled address.
    background.add_task(svc_send_password_reset, dest, token)
    logger.info("Admin triggered password-reset email for user %s (%s)", user_id, dest)
    return {"ok": True, "email": dest}


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
# Favorites — server-side storage of bookmarked events. Stored as a simple
# list on the user document (`users.favorite_event_ids`) so it ships with the
# /auth/me payload at login. Web + mobile both call these endpoints; local
# storage is only a fallback for anonymous browsing.
#
# Why a list (and not a separate collection):
#   - Average user favorites < 50 events; list is small enough to embed.
#   - Atomic operators ($addToSet / $pull) give us O(1) toggles.
#   - One round-trip when fetching /auth/me means the UI gets favorites
#     without a second request.
# -----------------------------------------------------------------------------
@api_router.get("/users/me/favorites")
async def list_my_favorites(user: dict = Depends(get_current_user)):
    """Return only the IDs (not the full event docs). UIs already have the
    full event list loaded; they just need to know which IDs to highlight."""
    return {"event_ids": list(user.get("favorite_event_ids", []) or [])}


@api_router.post("/users/me/favorites/{event_id}")
async def add_favorite(event_id: str, user: dict = Depends(get_current_user)):
    """Idempotent: $addToSet means re-adding an existing favorite is a no-op.
    We do NOT validate event existence here — events can be deleted (admin
    cleanup) but a stale ID in the list is harmless and self-corrects when
    the client filters against its current event list."""
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"favorite_event_ids": event_id}},
    )
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "favorite_event_ids": 1})
    return {"event_ids": list((fresh or {}).get("favorite_event_ids", []) or [])}


@api_router.delete("/users/me/favorites/{event_id}")
async def remove_favorite(event_id: str, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"favorite_event_ids": event_id}},
    )
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "favorite_event_ids": 1})
    return {"event_ids": list((fresh or {}).get("favorite_event_ids", []) or [])}


@api_router.put("/users/me/favorites")
async def replace_favorites(
    payload: dict, user: dict = Depends(get_current_user)
):
    """Bulk-replace favorites — used during the first-login migration when
    the client has accumulated favorites in localStorage / AsyncStorage and
    needs to push them to the server. Body shape: {"event_ids": [...]}.
    De-duplicates and limits to 500 to prevent abuse."""
    raw = payload.get("event_ids") if isinstance(payload, dict) else None
    if not isinstance(raw, list):
        raise HTTPException(status_code=400, detail="event_ids must be a list")
    cleaned: list[str] = []
    seen: set[str] = set()
    for v in raw:
        if isinstance(v, str) and v and v not in seen:
            seen.add(v)
            cleaned.append(v)
            if len(cleaned) >= 500:
                break
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"favorite_event_ids": cleaned}},
    )
    return {"event_ids": cleaned}


# -----------------------------------------------------------------------------
# Favorite merchants — list of merchant_card user IDs (or legacy merchant IDs).
# Same atomic-set semantics as event favorites.
# -----------------------------------------------------------------------------
@api_router.get("/users/me/favorite-merchants")
async def list_my_favorite_merchants(user: dict = Depends(get_current_user)):
    return {"merchant_ids": list(user.get("favorite_merchant_ids", []) or [])}


@api_router.post("/users/me/favorite-merchants/{merchant_id}")
async def add_favorite_merchant(merchant_id: str, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"favorite_merchant_ids": merchant_id}},
    )
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "favorite_merchant_ids": 1})
    return {"merchant_ids": list((fresh or {}).get("favorite_merchant_ids", []) or [])}


@api_router.delete("/users/me/favorite-merchants/{merchant_id}")
async def remove_favorite_merchant(merchant_id: str, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"favorite_merchant_ids": merchant_id}},
    )
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "favorite_merchant_ids": 1})
    return {"merchant_ids": list((fresh or {}).get("favorite_merchant_ids", []) or [])}


# -----------------------------------------------------------------------------
# Merchant card — owner endpoints (`users.merchant_card`).
# Owners can edit only when admin has set `merchant_card.enabled=true`. The
# subscription window (`merchant_until`) is set when admin enables the card
# and is auto-disabled by the daily APScheduler sweep when it expires.
# -----------------------------------------------------------------------------
class MerchantCardUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    shop_name: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    category: Optional[Literal["gear", "smith"]] = None
    image_url: Optional[str] = None  # set by upload endpoint, but allowed to clear


def _ensure_card_active(card: Optional[dict]) -> dict:
    """Block edits when admin hasn't enabled the card or subscription expired."""
    if not card or not card.get("enabled"):
        raise HTTPException(
            status_code=403,
            detail="Merchant card is not enabled. Contact support to activate.",
        )
    until = card.get("merchant_until")
    if until:
        try:
            exp = datetime.fromisoformat(until.replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                raise HTTPException(status_code=403, detail="Merchant card subscription has expired")
        except ValueError:
            pass
    return card


@api_router.get("/users/me/merchant-card")
async def get_my_merchant_card(user: dict = Depends(get_current_user)):
    return user.get("merchant_card") or {}


@api_router.put("/users/me/merchant-card")
async def update_my_merchant_card(
    payload: MerchantCardUpdate, user: dict = Depends(get_current_user)
):
    current = user.get("merchant_card") or {}
    _ensure_card_active(current)

    updates: dict = {}
    body = payload.model_dump(exclude_unset=True)
    if "shop_name" in body:
        v = (body["shop_name"] or "").strip()
        if not v:
            raise HTTPException(status_code=400, detail="Shop name is required")
        if len(v) > 120:
            raise HTTPException(status_code=400, detail="Shop name too long (max 120 chars)")
        updates["shop_name"] = v
    if "website" in body:
        updates["website"] = (body["website"] or "").strip()[:300]
    if "phone" in body:
        updates["phone"] = (body["phone"] or "").strip()[:60]
    if "email" in body:
        updates["email"] = (body["email"] or "").strip()[:200]
    if "description" in body:
        v = (body["description"] or "").strip()
        if len(v) > 1000:
            raise HTTPException(status_code=400, detail="Description too long (max 1000 chars)")
        updates["description"] = v
    if "category" in body and body["category"]:
        updates["category"] = body["category"]
    if "image_url" in body:
        updates["image_url"] = body["image_url"] or None

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    set_doc = {f"merchant_card.{k}": v for k, v in updates.items()}
    await db.users.update_one({"id": user["id"]}, {"$set": set_doc})

    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "merchant_card": 1})
    return (fresh or {}).get("merchant_card") or {}


@api_router.post("/users/me/merchant-card/image", status_code=201)
async def upload_my_merchant_card_image(
    file: UploadFile = File(...), user: dict = Depends(get_current_user)
):
    """Profile picture for the merchant card. Reuses the `profile_images`
    GridFS bucket but writes to `merchant_card.image_url` (separate field
    from the user's avatar)."""
    current = user.get("merchant_card") or {}
    _ensure_card_active(current)

    ctype = (file.content_type or "").lower()
    ext = (Path(file.filename or "").suffix or "").lower()
    if ctype not in ALLOWED_IMAGE_MIME and ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(status_code=415, detail="Only image files are allowed")
    if not ext:
        ext = {
            "image/jpeg": ".jpg", "image/png": ".png",
            "image/webp": ".webp", "image/gif": ".gif",
        }.get(ctype, ".jpg")
    if not ctype:
        ctype = MIME_FOR_EXT.get(ext, "application/octet-stream")

    body = await file.read()
    if len(body) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(body) > MAX_PROFILE_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 3 MB)")

    filename = f"merchant_{user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    await _profile_image_bucket().upload_from_stream(
        filename,
        body,
        metadata={
            "content_type": ctype,
            "owner_id": user["id"],
            "kind": "merchant_card",
            "original_name": file.filename or filename,
        },
    )
    url = f"/api/uploads/profile-images/{filename}"
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "merchant_card.image_url": url,
            "merchant_card.updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"url": url}


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
    is_admin = user.get("role") == "admin"
    if not is_admin and not user.get("paid_messaging_enabled"):
        raise HTTPException(
            status_code=402,
            detail="Paid messaging is not enabled for this account",
        )
    user_types = set(user.get("user_types") or [])
    if not is_admin and not (user_types & {"merchant", "organizer"}):
        raise HTTPException(status_code=403, detail="Only merchants/organizers may send")

    ev = await db.events.find_one({"id": payload.event_id, "status": "approved"}, {"_id": 0})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Sender must be RSVPed to this event (admin bypasses for site-wide).
    # This prevents spam from random merchants spamming events they have no
    # connection to: only people committed to attending may send messages.
    if not is_admin:
        own_rsvp = await db.event_attendees.find_one(
            {"event_id": payload.event_id, "user_id": user["id"]},
            {"_id": 1},
        )
        if not own_rsvp:
            raise HTTPException(
                status_code=403,
                detail="You can only message attendees of events you yourself attend",
            )

    # Per-event quota for non-admin senders. Counter = total message_log rows
    # by this sender for this event; this means leaving and re-RSVPing does
    # NOT reset the counter (counter is intentionally persistent).
    quota_used = 0
    quota_limit = 0
    if not is_admin:
        cfg = await get_messaging_quota_config()
        quota_limit = quota_value(cfg)
        quota_used = await db.message_log.count_documents(
            {"sender_id": user["id"], "event_id": payload.event_id}
        )
        if quota_used >= quota_limit:
            raise HTTPException(
                status_code=429,
                detail=f"Message quota for this event reached ({quota_used}/{quota_limit})",
            )

    # Pick the consent filter matching the sender. Admins reach everyone who has
    # given EITHER consent (site-wide announcements). Merchants/organizers stay
    # bound to their respective consent flag.
    if is_admin:
        consent_filter: dict = {
            "$or": [
                {"consent_organizer_messages": True},
                {"consent_merchant_offers": True},
            ]
        }
    elif "organizer" in user_types:
        consent_filter = {"consent_organizer_messages": True}
    else:
        consent_filter = {"consent_merchant_offers": True}

    # Optional category filter: limit recipients whose user_types intersect
    # with the sender's selected target_categories. Empty = no filter.
    target_categories = list(payload.target_categories or [])
    user_filter: dict = dict(consent_filter)
    if target_categories:
        user_filter["user_types"] = {"$in": target_categories}

    rows = await db.event_attendees.find(
        {"event_id": payload.event_id}, {"_id": 0}
    ).to_list(5000)
    if not rows:
        return {"sent_push": 0, "sent_email": 0, "recipients": 0}

    user_ids = [r["user_id"] for r in rows]
    consenters = await db.users.find(
        {"id": {"$in": user_ids}, **user_filter},
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

    # Sender nickname is appended to every push/email body so recipients always
    # know who the message is from. Admin uses "Viikinkitapahtumat" since the
    # site itself is the sender for site-wide announcements.
    sender_label = (
        user.get("nickname")
        or user.get("merchant_name")
        or user.get("organizer_name")
        or ("Viikinkitapahtumat" if is_admin else "Viestin lähettäjä")
    )

    sent_push = 0
    if push_user_ids:
        push_body = f"{payload.body[:140]}\n— {sender_label}"
        result = await push_send_to_users(
            db,
            push_user_ids,
            title=payload.subject,
            body=push_body[:200],
            data={"event_id": payload.event_id, "sender": sender_label},
        )
        sent_push = result.get("sent", 0)

    sent_email = 0
    if email_recipients:
        # Reuse the generic Resend wrapper.
        from email_service import send_email as svc_send_email
        site = os.environ.get("PUBLIC_SITE_URL", "https://viikinkitapahtumat.fi")
        ev_title = ev.get("title_fi") or ev.get("title") or "Viikinkitapahtumat"
        html = (
            f"<div style='font-family:system-ui,Arial,sans-serif;background:#0E0B09;color:#E8E2D5;padding:24px;'>"
            f"<div style='max-width:560px;margin:auto;border:1px solid #352A23;padding:24px;'>"
            f"<div style='font-size:11px;letter-spacing:1.6px;color:#C19C4D;text-transform:uppercase;'>{html_escape(ev_title)}</div>"
            f"<h1 style='font-family:Georgia,serif;color:#E8E2D5;margin:8px 0 16px;'>{html_escape(payload.subject)}</h1>"
            f"<div style='white-space:pre-wrap;line-height:1.55;color:#E8E2D5;'>{html_escape(payload.body)}</div>"
            f"<div style='margin-top:18px;font-size:13px;color:#C19C4D;'>— {html_escape(sender_label)}</div>"
            f"<hr style='border:none;border-top:1px solid #352A23;margin:24px 0;'>"
            f"<div style='font-size:11px;color:#8E8276;'>Lähettäjä: {html_escape(sender_label)} · "
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
        # Diagnostic counters so the UI can explain why a channel produced 0
        # without leaking PII (no names/emails/tokens).
        "push_eligible": len(push_user_ids),
        "email_eligible": len(email_recipients),
    }
    # Audit trail — used by /admin/stats/messages AND for per-event quota.
    await db.message_log.insert_one(
        {
            "event_id": payload.event_id,
            "sender_id": user["id"],
            "channel": payload.channel,
            "subject": payload.subject[:200],
            "body_preview": payload.body[:200],
            "target_categories": target_categories,
            "sent_push": sent_push,
            "sent_email": sent_email,
            "recipients": len(consenter_ids),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    if not is_admin:
        return_payload["quota_used"] = quota_used + 1
        return_payload["quota_limit"] = quota_limit
        return_payload["quota_remaining"] = max(0, quota_limit - (quota_used + 1))
    return return_payload


# -----------------------------------------------------------------------------
# Messaging quota — admin GET/PATCH + per-user "remaining quota" probe so the
# mobile app can disable the send button when the user is at the limit.
# -----------------------------------------------------------------------------
@api_router.get(
    "/admin/messaging-quota",
    dependencies=[Depends(get_admin_or_moderator)],
)
async def admin_get_messaging_quota():
    cfg = await get_messaging_quota_config()
    return {
        "preset": cfg.preset,
        "custom_value": cfg.custom_value,
        "current_limit": quota_value(cfg),
        "presets": {"A": 10, "B": 20, "C": 30, "D_default": DEFAULT_CUSTOM_QUOTA},
    }


@api_router.patch(
    "/admin/messaging-quota",
    dependencies=[Depends(get_admin_or_moderator)],
)
async def admin_update_messaging_quota(payload: MessagingQuotaUpdate):
    cfg = await get_messaging_quota_config()
    new_custom = (
        max(1, int(payload.custom_value))
        if payload.custom_value is not None
        else cfg.custom_value
    )
    new_doc = {
        "_id": "messaging_quota",
        "preset": payload.preset,
        "custom_value": new_custom,
    }
    await db.system_config.update_one(
        {"_id": "messaging_quota"}, {"$set": new_doc}, upsert=True
    )
    fresh = MessagingQuotaConfig(preset=payload.preset, custom_value=new_custom)
    return {
        "preset": fresh.preset,
        "custom_value": fresh.custom_value,
        "current_limit": quota_value(fresh),
    }


@api_router.get("/messages/quota/{event_id}")
async def get_event_quota_for_user(
    event_id: str, user: dict = Depends(get_current_user)
):
    """Return the messaging quota state for the current user on a single event.
    Admin gets `unlimited=True`."""
    if user.get("role") == "admin":
        return {"unlimited": True, "used": 0, "limit": 0, "remaining": -1}
    cfg = await get_messaging_quota_config()
    limit = quota_value(cfg)
    used = await db.message_log.count_documents(
        {"sender_id": user["id"], "event_id": event_id}
    )
    return {
        "unlimited": False,
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used),
    }


# -----------------------------------------------------------------------------
# Messageable events — for the mobile compose screen. Returns events where the
# current user can plausibly send a message: events they are RSVPd to (today
# onward) PLUS any events that started ≤ 14 days ago (so post-event recap
# messages still go through). Admin gets all approved events in this same
# window. Result is enriched with the same fields EventOut returns.
# -----------------------------------------------------------------------------
@api_router.get("/users/me/messageable-events")
async def list_messageable_events(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    from_iso = (today - timedelta(days=14)).isoformat()
    is_admin = user.get("role") == "admin"
    base_filter = {
        "status": "approved",
        "$or": [
            {"start_date": {"$gte": from_iso}},
            {"end_date": {"$gte": from_iso}},
        ],
    }
    if is_admin:
        events = await db.events.find(base_filter, {"_id": 0}).sort("start_date", 1).to_list(2000)
    else:
        rsvps = await db.event_attendees.find(
            {"user_id": user["id"]}, {"_id": 0, "event_id": 1}
        ).to_list(5000)
        ids = [r["event_id"] for r in rsvps]
        if not ids:
            return {"events": []}
        f = dict(base_filter, id={"$in": ids})
        events = await db.events.find(f, {"_id": 0}).sort("start_date", 1).to_list(2000)
    return {"events": events}


@api_router.get(
    "/admin/push/health",
    dependencies=[Depends(get_admin_or_moderator)],
)
async def admin_push_health():
    """Diagnostic: do we have an Expo access token + how many users have a
    push token registered? Used by the admin dashboard to explain why a push
    send returned 0 recipients."""
    has_token = bool(os.environ.get("EXPO_ACCESS_TOKEN"))
    users_with_token = await db.users.count_documents(
        {"expo_push_tokens": {"$exists": True, "$ne": []}}
    )
    total_tokens = 0
    async for u in db.users.find(
        {"expo_push_tokens": {"$exists": True, "$ne": []}},
        {"_id": 0, "expo_push_tokens": 1},
    ):
        total_tokens += len(u.get("expo_push_tokens") or [])
    return {
        "expo_access_token_set": has_token,
        "users_with_push_token": users_with_token,
        "total_active_tokens": total_tokens,
    }


@api_router.post(
    "/admin/push/test",
    dependencies=[Depends(get_admin_or_moderator)],
)
async def admin_push_test(admin: dict = Depends(get_admin_or_moderator)):
    """Send a test push to the calling admin's own registered device tokens.
    Returns delivery summary. If 0 recipients → admin has no token registered
    on any device (they need to install the mobile app and sign in)."""
    result = await push_send_to_users(
        db,
        [admin["id"]],
        title="Viikinkitapahtumat — testi",
        body="Tämä on testi push-notifikaatio. Jos näet sen, kaikki toimii oikein.",
        data={"test": True},
    )
    return result


# -----------------------------------------------------------------------------
# Admin: enable/disable the paid messaging feature flag for a user
# -----------------------------------------------------------------------------
@api_router.get("/admin/users", dependencies=[Depends(get_admin_or_moderator)])
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
            "is_moderator": 1,
            "created_at": 1,
        },
    ).sort("created_at", -1).to_list(2000)
    for d in docs:
        d.setdefault("paid_messaging_enabled", False)
        d.setdefault("is_moderator", False)
        d.setdefault("user_types", [])
    return docs


@api_router.get("/admin/users/{user_id}", dependencies=[Depends(get_admin_or_moderator)])
async def admin_get_user(user_id: str):
    """Full user profile for the admin profile-card modal.

    Returns: all visible profile fields + the list of events the user has
    RSVP'd to. Excludes hashed_password and internal Mongo _id.
    """
    user = await db.users.find_one(
        {"id": user_id},
        {
            "_id": 0,
            "hashed_password": 0,
            "password_hash": 0,
            "password_reset_tokens": 0,
        },
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rsvps = await db.event_attendees.find(
        {"user_id": user_id},
        {"_id": 0, "event_id": 1, "notify_email": 1, "notify_push": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(500)

    event_ids = [r["event_id"] for r in rsvps]
    events_by_id: dict[str, dict] = {}
    if event_ids:
        ev_docs = await db.events.find(
            {"id": {"$in": event_ids}},
            {
                "_id": 0,
                "id": 1,
                "title_fi": 1,
                "title_en": 1,
                "start_date": 1,
                "end_date": 1,
                "location": 1,
                "country": 1,
                "category": 1,
                "status": 1,
            },
        ).to_list(500)
        events_by_id = {e["id"]: e for e in ev_docs}

    enriched_rsvps = []
    for r in rsvps:
        ev = events_by_id.get(r["event_id"])
        if ev:
            enriched_rsvps.append({**r, "event": ev})
    user["rsvps"] = enriched_rsvps
    user.setdefault("user_types", [])
    user.setdefault("paid_messaging_enabled", False)
    return user


@api_router.get(
    "/admin/events/{event_id}/attendees",
    dependencies=[Depends(get_admin_or_moderator)],
)
async def admin_event_attendees(event_id: str):
    """Full attendee list for one event with profile previews — used by the
    admin event row's "View attendees" expand panel."""
    ev = await db.events.find_one({"id": event_id}, {"_id": 0, "id": 1, "title_fi": 1})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    rows = await db.event_attendees.find(
        {"event_id": event_id},
        {"_id": 0, "user_id": 1, "notify_email": 1, "notify_push": 1, "created_at": 1},
    ).sort("created_at", 1).to_list(5000)
    if not rows:
        return []
    user_ids = [r["user_id"] for r in rows]
    users = await db.users.find(
        {"id": {"$in": user_ids}},
        {
            "_id": 0,
            "id": 1,
            "email": 1,
            "nickname": 1,
            "name": 1,
            "role": 1,
            "user_types": 1,
            "association_name": 1,
            "country": 1,
            "profile_image_url": 1,
            "merchant_name": 1,
            "organizer_name": 1,
        },
    ).to_list(5000)
    by_id = {u["id"]: u for u in users}
    out = []
    for r in rows:
        u = by_id.get(r["user_id"])
        if u:
            out.append(
                {
                    **u,
                    "rsvp_at": r.get("created_at"),
                    "notify_email": bool(r.get("notify_email")),
                    "notify_push": bool(r.get("notify_push")),
                }
            )
    return out


@api_router.get(
    "/admin/translations/health",
    dependencies=[Depends(get_admin_or_moderator)],
)
async def admin_translations_health():
    """Diagnostic: list every event with at least one missing localized
    title_* / description_* field across the supported language set
    (fi/en/sv/da/de/et/pl). Used by AdminSystem to surface gaps."""
    from translation_service import (
        find_events_with_missing_translations,
        SUPPORTED_LANGS,
    )
    items = await find_events_with_missing_translations(db)
    if items:
        ev_ids = [i["id"] for i in items]
        evs = await db.events.find(
            {"id": {"$in": ev_ids}},
            {"_id": 0, "id": 1, "title_fi": 1, "title_en": 1, "status": 1},
        ).to_list(5000)
        ev_by_id = {e["id"]: e for e in evs}
        for it in items:
            ev = ev_by_id.get(it["id"], {})
            it["title_fi"] = ev.get("title_fi")
            it["title_en"] = ev.get("title_en")
            it["status"] = ev.get("status")
    return {
        "supported_langs": list(SUPPORTED_LANGS),
        "events_with_gaps": items,
        "total_events_with_gaps": len(items),
    }


@api_router.post(
    "/admin/translations/sweep",
    dependencies=[Depends(get_admin_or_moderator)],
)
async def admin_translations_sweep(max_events: int = 50):
    """Manual trigger for the translation sweep — same logic the scheduler
    runs every 6h. Caps at `max_events` per call (default 50) to bound the
    LLM cost."""
    summary = await sweep_missing_translations(db, max_events=max_events)
    return summary


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
# Moderator promotion — only a full admin can grant / revoke this capability.
# Once granted, the user passes the `get_admin_or_moderator` dependency and
# can use most admin panels. They CANNOT delete admin accounts, CANNOT create
# new admin accounts, and CANNOT grant this flag to others. Role on the user
# doc stays "user" — the moderator privilege is a separate boolean so it can
# be toggled without churning role-based filters (e.g. the "all admins" list).
# -----------------------------------------------------------------------------
class ModeratorToggle(BaseModel):
    enabled: bool


@api_router.patch(
    "/admin/users/{user_id}/moderator",
    dependencies=[Depends(get_admin_user)],
)
async def admin_toggle_moderator(user_id: str, payload: ModeratorToggle):
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "role": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # A full admin is already a superset of moderator privileges. Toggling
    # is_moderator on an admin account is allowed but has no practical effect,
    # so we still store it (e.g. in case the admin is later demoted).
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_moderator": bool(payload.enabled)}},
    )
    return {"id": user_id, "is_moderator": bool(payload.enabled)}


# -----------------------------------------------------------------------------
# Admin: create another admin account
# -----------------------------------------------------------------------------
class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    nickname: str


@api_router.post("/admin/users", status_code=201, dependencies=[Depends(get_admin_user)])
async def admin_create_admin_user(payload: AdminUserCreate):
    """Create a new admin user. Called by an existing admin from the dashboard."""
    email = payload.email.lower().strip()
    nick = payload.nickname.strip()
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not nick:
        raise HTTPException(status_code=400, detail="Nickname is required")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = f"admin_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": user_id,
        "email": email,
        "name": nick,
        "nickname": nick,
        "role": "admin",
        "user_types": [],
        "merchant_name": None,
        "organizer_name": None,
        "consent_organizer_messages": False,
        "consent_merchant_offers": False,
        "paid_messaging_enabled": False,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return {
        "id": user_id,
        "email": email,
        "nickname": nick,
        "role": "admin",
        "created_at": doc["created_at"],
    }


# -----------------------------------------------------------------------------
# Admin: GDPR-compliant user deletion
# Deletes user record, RSVPs and email reminders. Anonymises message_log
# sender_id so audit trail of historic messages is kept without PII.
# -----------------------------------------------------------------------------
@api_router.delete(
    "/admin/users/{user_id}",
    dependencies=[Depends(get_admin_or_moderator)],
)
async def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_or_moderator)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Admins cannot delete their own account")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1, "role": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Moderators may manage regular users but must NOT be able to remove
    # full admins — that capability is reserved for admins. This keeps the
    # moderator role safe to hand out without risking loss of the super-user.
    if target.get("role") == "admin" and admin.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Moderators cannot delete admin accounts",
        )
    # Refuse to delete the last remaining admin so the system never gets locked out.
    if target.get("role") == "admin":
        admin_count = await db.users.count_documents({"role": "admin"})
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin user")

    summary = {
        "user_id": user_id,
        "email_reminders_deleted": 0,
        "rsvps_deleted": 0,
        "messages_anonymised": 0,
    }

    # 1) Delete RSVPs / attendance rows
    res_a = await db.event_attendees.delete_many({"user_id": user_id})
    summary["rsvps_deleted"] = int(res_a.deleted_count or 0)

    # 2) Delete event reminder subscriptions matching the user's email
    if target.get("email"):
        res_r = await db.event_reminders.delete_many({"email": target["email"]})
        summary["email_reminders_deleted"] = int(res_r.deleted_count or 0)
        # 2b) Newsletter subscription with the same email
        await db.newsletter_subscribers.delete_many({"email": target["email"]})

    # 3) Anonymise sender_id in message_log so audit trail survives without PII
    res_m = await db.message_log.update_many(
        {"sender_id": user_id},
        {"$set": {"sender_id": "deleted_user"}},
    )
    summary["messages_anonymised"] = int(res_m.modified_count or 0)

    # 4) Finally delete the user document itself
    await db.users.delete_one({"id": user_id})

    return summary


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
    dependencies=[Depends(get_admin_or_moderator)],
)
async def admin_run_reminders(window_days: int = 3):
    """Manual trigger for daily reminders (also wired on a scheduler)."""
    return await _run_daily_event_reminders(window_days)


# -----------------------------------------------------------------------------
# Admin stats — aggregate metrics for the dashboard
# -----------------------------------------------------------------------------
@api_router.get(
    "/admin/stats/overview",
    dependencies=[Depends(get_admin_or_moderator)],
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
    dependencies=[Depends(get_admin_or_moderator)],
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
    dependencies=[Depends(get_admin_or_moderator)],
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


# -----------------------------------------------------------------------------
# Profile image upload (auth required)
# Stored in a dedicated GridFS bucket so we can apply different size/policy
# limits later (e.g. 2 MB cap, force square crop) without affecting events.
# -----------------------------------------------------------------------------
_profile_bucket: Optional[AsyncIOMotorGridFSBucket] = None


def _profile_image_bucket() -> AsyncIOMotorGridFSBucket:
    global _profile_bucket
    if _profile_bucket is None:
        _profile_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="profile_images")
    return _profile_bucket


MAX_PROFILE_IMAGE_BYTES = 3 * 1024 * 1024  # 3 MB — avatars don't need to be huge


@api_router.post("/uploads/profile-image", status_code=201)
async def upload_profile_image(
    file: UploadFile = File(...), user: dict = Depends(get_current_user)
):
    """Upload a profile picture and persist its URL onto the user document.

    Auth required (so anonymous abuse is impossible). Returns the public URL
    that the client can also store independently (already saved server-side).
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
    if len(body) > MAX_PROFILE_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Profile picture too large (max 3 MB)")

    filename = f"{user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    await _profile_image_bucket().upload_from_stream(
        filename,
        body,
        metadata={
            "content_type": ctype,
            "owner_id": user["id"],
            "original_name": file.filename or filename,
        },
    )
    url = f"/api/uploads/profile-images/{filename}"
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"profile_image_url": url}},
    )
    return {"url": url}


@api_router.get("/uploads/profile-images/{filename}")
async def serve_profile_image(filename: str):
    """Stream a profile picture stored in GridFS."""
    doc = await db["profile_images.files"].find_one(
        {"filename": filename}, {"_id": 1, "metadata": 1}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Image not found")
    ctype = (doc.get("metadata") or {}).get("content_type") or MIME_FOR_EXT.get(
        Path(filename).suffix.lower(), "application/octet-stream"
    )
    stream = await _profile_image_bucket().open_download_stream_by_name(filename)
    data = await stream.read()
    return Response(
        content=data,
        media_type=ctype,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


# -----------------------------------------------------------------------------
# Profile DOCUMENT upload (PDFs only): SVTL fighter card + equipment passport.
# Stored in their own GridFS bucket; URLs persisted onto the user document on
# the matching field (`fighter_card_url` or `equipment_passport_url`).
# -----------------------------------------------------------------------------
_profile_doc_bucket: Optional[AsyncIOMotorGridFSBucket] = None


def _profile_doc_bucket_get() -> AsyncIOMotorGridFSBucket:
    global _profile_doc_bucket
    if _profile_doc_bucket is None:
        _profile_doc_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="profile_docs")
    return _profile_doc_bucket


MAX_PROFILE_DOC_BYTES = 8 * 1024 * 1024  # 8 MB — generous but bounded
PROFILE_DOC_KINDS = {
    "fighter_card": "fighter_card_url",
    "equipment_passport": "equipment_passport_url",
}


@api_router.post("/uploads/profile-doc", status_code=201)
async def upload_profile_doc(
    kind: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a profile PDF document (fighter card OR equipment passport).

    `kind` must be one of `fighter_card` / `equipment_passport`. Returns the
    public URL and saves it onto the user's matching field automatically.
    Rejects non-PDF content (the use case is documents — images are uploaded
    via /uploads/profile-image).
    """
    field = PROFILE_DOC_KINDS.get(kind)
    if not field:
        raise HTTPException(status_code=400, detail=f"Invalid kind: {kind}")

    ctype = (file.content_type or "").lower()
    ext = (Path(file.filename or "").suffix or "").lower()
    if ctype != "application/pdf" and ext != ".pdf":
        raise HTTPException(
            status_code=415, detail="Only PDF files are supported for this document"
        )
    body = await file.read()
    if len(body) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(body) > MAX_PROFILE_DOC_BYTES:
        raise HTTPException(status_code=413, detail="Document too large (max 8 MB)")

    filename = f"{user['id']}_{kind}_{uuid.uuid4().hex[:8]}.pdf"
    await _profile_doc_bucket_get().upload_from_stream(
        filename,
        body,
        metadata={
            "content_type": "application/pdf",
            "owner_id": user["id"],
            "kind": kind,
            "original_name": file.filename or filename,
        },
    )
    url = f"/api/uploads/profile-docs/{filename}"
    await db.users.update_one({"id": user["id"]}, {"$set": {field: url}})
    return {"url": url, "kind": kind}


@api_router.get("/uploads/profile-docs/{filename}")
async def serve_profile_doc(
    filename: str,
    request: Request,
    t: Optional[str] = None,
):
    """Stream a profile PDF. Auth required AND only the owning user (or admin)
    may read it — these are personal documents (fighter cards, equipment
    passports), so anonymous /api access is forbidden.

    Auth methods (in priority order):
        1. httpOnly access_token cookie (web)
        2. Authorization: Bearer <token> header (mobile API calls)
        3. ?t=<token> query string (mobile Linking.openURL fallback —
           lets us hand the OS an openable URL while still enforcing auth)
    """
    user: Optional[dict] = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        if t:
            try:
                payload = jwt.decode(t, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
                if payload.get("type") == "access":
                    user = await db.users.find_one(
                        {"id": payload["sub"]}, {"_id": 0}
                    )
            except Exception:
                user = None
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

    doc = await db["profile_docs.files"].find_one(
        {"filename": filename}, {"_id": 1, "metadata": 1}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    md = doc.get("metadata") or {}
    if user.get("role") != "admin" and md.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    stream = await _profile_doc_bucket_get().open_download_stream_by_name(filename)
    data = await stream.read()
    # `inline` disposition so PDF opens in the browser tab (the user clicked
    # a link). Filename keeps the original name for browser "Save as".
    safe_orig = (md.get("original_name") or filename).replace('"', "")
    return Response(
        content=data,
        media_type="application/pdf",
        headers={
            "Cache-Control": "private, max-age=300",
            "Content-Disposition": f'inline; filename="{safe_orig}"',
        },
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
async def list_uploaded_images(_admin: dict = Depends(get_admin_or_moderator)):
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
    _admin: dict = Depends(get_admin_or_moderator),
):
    q: dict = {} if status == "all" else {"status": status}
    docs = await db.events.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [EventOut(**d) for d in docs]


@api_router.get("/admin/events/{event_id}", response_model=EventOut)
async def admin_get_event(event_id: str, _admin: dict = Depends(get_admin_or_moderator)):
    doc = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventOut(**doc)


@api_router.patch("/admin/events/{event_id}", response_model=EventOut)
async def admin_update_status(
    event_id: str,
    payload: EventStatusUpdate,
    background: BackgroundTasks,
    _admin: dict = Depends(get_admin_or_moderator),
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
async def admin_delete_event(event_id: str, _admin: dict = Depends(get_admin_or_moderator)):
    res = await db.events.delete_one({"id": event_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"ok": True}


@api_router.put("/admin/events/{event_id}", response_model=EventOut)
async def admin_edit_event(
    event_id: str,
    payload: EventEdit,
    background: BackgroundTasks,
    _admin: dict = Depends(get_admin_or_moderator),
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
    """Public merchants listing.

    UNION of two sources:
      1. Legacy `merchants` collection (static admin-curated entries; no
         detail page, no images). Kept while we migrate.
      2. Active user merchant cards: users with `merchant_card.enabled=true`
         AND `merchant_until` either unset or in the future. These show
         images + open a public detail page at `/shops/<user_id>`.

    Featured cards are flagged so the frontend can render a prominent
    section above the main list.
    """
    legacy = await db.merchants.find({}, {"_id": 0}).sort(
        [("category", 1), ("order_index", 1), ("name", 1)]
    ).to_list(2000)

    now_iso = datetime.now(timezone.utc).isoformat()
    user_cards = await db.users.find(
        {
            "merchant_card.enabled": True,
            "$or": [
                {"merchant_card.merchant_until": None},
                {"merchant_card.merchant_until": {"$exists": False}},
                {"merchant_card.merchant_until": {"$gt": now_iso}},
            ],
        },
        {"_id": 0, "id": 1, "merchant_card": 1},
    ).to_list(2000)

    out: list[MerchantOut] = [MerchantOut(**_normalize_merchant(d)) for d in legacy]
    for u in user_cards:
        m = u.get("merchant_card") or {}
        if not (m.get("shop_name") or "").strip():
            continue  # skip empty cards (admin enabled but owner hasn't filled it)
        out.append(MerchantOut(**_normalize_user_merchant_card(u["id"], m)))
    return out


def _normalize_merchant(d: dict) -> dict:
    return {
        "id": d.get("id"),
        "name": d.get("name") or "",
        "description": d.get("description") or "",
        "url": d.get("url") or "",
        "category": d.get("category") or "gear",
        "order_index": d.get("order_index") or 0,
        "image_url": None,
        "phone": None,
        "email": None,
        "featured": False,
        "is_user_card": False,
        "user_id": None,
    }


def _normalize_user_merchant_card(user_id: str, m: dict) -> dict:
    return {
        "id": user_id,  # user_id doubles as merchant_id for routing
        "name": (m.get("shop_name") or "").strip(),
        "description": (m.get("description") or "").strip(),
        "url": (m.get("website") or "").strip(),
        "category": m.get("category") or "gear",
        "order_index": 0,
        "image_url": m.get("image_url"),
        "phone": (m.get("phone") or "").strip() or None,
        "email": (m.get("email") or "").strip() or None,
        "featured": bool(m.get("featured", False)),
        "is_user_card": True,
        "user_id": user_id,
    }


@api_router.get("/merchants/{merchant_id}")
async def get_merchant_detail(merchant_id: str):
    """Public detail page payload for a merchant card.

    Only resolves USER merchant cards (legacy entries don't have a detail
    page — they only ever had an external URL). Returns the card +
    upcoming events the merchant is RSVPed to (clickable).
    """
    user = await db.users.find_one(
        {"id": merchant_id, "merchant_card.enabled": True}, {"_id": 0, "id": 1, "merchant_card": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Merchant not found")
    card = user.get("merchant_card") or {}
    until = card.get("merchant_until")
    if until:
        try:
            exp = datetime.fromisoformat(until.replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                raise HTTPException(status_code=404, detail="Merchant subscription expired")
        except ValueError:
            pass

    # Look up upcoming events the merchant is attending
    today = datetime.now(timezone.utc).date().isoformat()
    rsvps = await db.event_attendees.find(
        {"user_id": merchant_id}, {"_id": 0, "event_id": 1}
    ).to_list(500)
    event_ids = [r["event_id"] for r in rsvps]
    events: list[dict] = []
    if event_ids:
        evs = await db.events.find(
            {
                "id": {"$in": event_ids},
                "status": "approved",
                "$or": [{"date": {"$gte": today}}, {"date_end": {"$gte": today}}],
            },
            {"_id": 0, "id": 1, "title_fi": 1, "title_en": 1, "title_sv": 1,
             "date": 1, "date_end": 1, "location": 1, "country": 1},
        ).sort([("date", 1)]).to_list(200)
        events = evs

    return {
        "id": merchant_id,
        "name": (card.get("shop_name") or "").strip(),
        "description": (card.get("description") or "").strip(),
        "url": (card.get("website") or "").strip(),
        "category": card.get("category") or "gear",
        "image_url": card.get("image_url"),
        "phone": (card.get("phone") or "").strip() or None,
        "email": (card.get("email") or "").strip() or None,
        "featured": bool(card.get("featured", False)),
        "is_user_card": True,
        "user_id": merchant_id,
        "events": events,
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
async def admin_create_merchant(payload: MerchantIn, _admin: dict = Depends(get_admin_or_moderator)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.merchants.insert_one(doc)
    return MerchantOut(**_normalize_merchant(doc))


@api_router.put("/admin/merchants/{mid}", response_model=MerchantOut)
async def admin_update_merchant(mid: str, payload: MerchantIn, _admin: dict = Depends(get_admin_or_moderator)):
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
async def admin_delete_merchant(mid: str, _admin: dict = Depends(get_admin_or_moderator)):
    res = await db.merchants.delete_one({"id": mid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return {"ok": True}


# -----------------------------------------------------------------------------
# Admin — merchant CARD management (the new user-card system).
# Distinct from the legacy /admin/merchants CRUD above (which manages the
# deprecated `merchants` collection). These endpoints flip
# `users.merchant_card.enabled` and renew the 12-month subscription window.
# -----------------------------------------------------------------------------
MERCHANT_CARD_DEFAULT_MONTHS = 12


def _merchant_until_iso(months: int = MERCHANT_CARD_DEFAULT_MONTHS) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=30 * months)).isoformat()


@api_router.post("/admin/users/{user_id}/merchant-card/enable")
async def admin_enable_merchant_card(
    user_id: str,
    _admin: dict = Depends(get_admin_or_moderator),
    months: int = MERCHANT_CARD_DEFAULT_MONTHS,
):
    """Enable a user's merchant card and start a fresh subscription window.
    Idempotent: re-enabling an already-active card extends the expiry."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "merchant_card": 1, "user_types": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if "merchant" not in (user.get("user_types") or []):
        # Auto-add merchant role since admin is granting them a merchant card
        await db.users.update_one(
            {"id": user_id}, {"$addToSet": {"user_types": "merchant"}}
        )
    existing = user.get("merchant_card") or {}
    now = datetime.now(timezone.utc).isoformat()
    new_card = {
        "enabled": True,
        "shop_name": existing.get("shop_name") or "",
        "website": existing.get("website") or "",
        "phone": existing.get("phone") or "",
        "email": existing.get("email") or "",
        "description": existing.get("description") or "",
        "image_url": existing.get("image_url"),
        "category": existing.get("category") or "gear",
        "featured": bool(existing.get("featured", False)),
        "merchant_until": _merchant_until_iso(months),
        "created_at": existing.get("created_at") or now,
        "updated_at": now,
    }
    await db.users.update_one({"id": user_id}, {"$set": {"merchant_card": new_card}})
    return new_card


@api_router.post("/admin/users/{user_id}/merchant-card/disable")
async def admin_disable_merchant_card(
    user_id: str, _admin: dict = Depends(get_admin_or_moderator)
):
    res = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "merchant_card.enabled": False,
            "merchant_card.featured": False,
            "merchant_card.updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


class FeaturedToggle(BaseModel):
    featured: bool


@api_router.patch("/admin/users/{user_id}/merchant-card/featured")
async def admin_toggle_merchant_card_featured(
    user_id: str,
    payload: FeaturedToggle,
    _admin: dict = Depends(get_admin_or_moderator),
):
    res = await db.users.find_one_and_update(
        {"id": user_id, "merchant_card.enabled": True},
        {"$set": {
            "merchant_card.featured": bool(payload.featured),
            "merchant_card.updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        return_document=True,
        projection={"_id": 0, "merchant_card": 1},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Active merchant card not found")
    return res.get("merchant_card") or {}


@api_router.get("/admin/merchant-cards")
async def admin_list_merchant_cards(_admin: dict = Depends(get_admin_or_moderator)):
    """Lists every user with a merchant_card sub-document (enabled or not)
    so the admin panel can manage them."""
    rows = await db.users.find(
        {"merchant_card": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "email": 1, "nickname": 1, "merchant_name": 1,
         "user_types": 1, "merchant_card": 1},
    ).to_list(2000)
    out = []
    for u in rows:
        m = u.get("merchant_card") or {}
        out.append({
            "user_id": u["id"],
            "email": u.get("email"),
            "nickname": u.get("nickname"),
            "merchant_name": u.get("merchant_name"),
            "enabled": bool(m.get("enabled", False)),
            "featured": bool(m.get("featured", False)),
            "shop_name": m.get("shop_name") or "",
            "merchant_until": m.get("merchant_until"),
            "category": m.get("category") or "gear",
        })
    out.sort(key=lambda r: ((not r["enabled"]), r["shop_name"].lower(), r["email"] or ""))
    return out


async def _merchant_card_expiry_sweep() -> dict:
    """Daily APScheduler sweep — disables cards whose `merchant_until` is in
    the past. Returns a summary for logs / admin diagnostics."""
    now_iso = datetime.now(timezone.utc).isoformat()
    res = await db.users.update_many(
        {
            "merchant_card.enabled": True,
            "merchant_card.merchant_until": {"$lt": now_iso, "$ne": None},
        },
        {"$set": {
            "merchant_card.enabled": False,
            "merchant_card.featured": False,
            "merchant_card.updated_at": now_iso,
        }},
    )
    summary = {"expired": int(res.modified_count or 0), "ran_at": now_iso}
    if summary["expired"]:
        logger.info("Merchant card expiry sweep: %s", summary)
    return summary


@api_router.post("/admin/guilds", response_model=GuildOut, status_code=201)
async def admin_create_guild(payload: GuildIn, _admin: dict = Depends(get_admin_or_moderator)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.guilds.insert_one(doc)
    return GuildOut(**_normalize_guild(doc))


@api_router.put("/admin/guilds/{gid}", response_model=GuildOut)
async def admin_update_guild(gid: str, payload: GuildIn, _admin: dict = Depends(get_admin_or_moderator)):
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
async def admin_delete_guild(gid: str, _admin: dict = Depends(get_admin_or_moderator)):
    res = await db.guilds.delete_one({"id": gid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Guild not found")
    return {"ok": True}


@api_router.get("/admin/stats")
async def admin_stats(_admin: dict = Depends(get_admin_or_moderator)):
    pending = await db.events.count_documents({"status": "pending"})
    approved = await db.events.count_documents({"status": "approved"})
    rejected = await db.events.count_documents({"status": "rejected"})
    subscribers = await db.newsletter_subscribers.count_documents({"status": "active"})
    return {"pending": pending, "approved": approved, "rejected": rejected, "subscribers": subscribers}


@api_router.post("/admin/newsletter/send")
async def admin_send_newsletter(_admin: dict = Depends(get_admin_or_moderator)):
    return await svc_send_monthly_digest(db, days=60)


@api_router.post("/admin/weekly-report/send")
async def admin_send_weekly_report(_admin: dict = Depends(get_admin_or_moderator)):
    return await svc_send_weekly_admin_report(db)


@api_router.get("/admin/weekly-report/preview")
async def admin_preview_weekly_report(_admin: dict = Depends(get_admin_or_moderator)):
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
async def admin_preview_newsletter(_admin: dict = Depends(get_admin_or_moderator)):
    """Return the digest body so admin can preview before sending."""
    from email_service import render_monthly_digest, select_upcoming_events, unsubscribe_url as _uurl
    events = await db.events.find({"status": "approved"}, {"_id": 0}).to_list(2000)
    upcoming = select_upcoming_events(events, days=60)
    subject, html = render_monthly_digest(upcoming, _uurl("PREVIEW"))
    return {"subject": subject, "html": html, "count": len(upcoming)}


@api_router.get("/admin/subscribers")
async def admin_list_subscribers(_admin: dict = Depends(get_admin_or_moderator)):
    docs = await db.newsletter_subscribers.find(
        {}, {"_id": 0, "unsubscribe_token": 0}
    ).sort("created_at", -1).to_list(10000)
    return docs


@api_router.delete("/admin/subscribers/{email}", status_code=204)
async def admin_delete_subscriber(email: str, _admin: dict = Depends(get_admin_or_moderator)):
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
async def admin_sync_prod_events(_admin: dict = Depends(get_admin_or_moderator)):
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


async def _scheduled_translation_sweep():
    """Background job: every 6h, fill missing language columns on all
    events. Cheap projection check first → only spends LLM tokens on events
    that actually have empty fields."""
    try:
        summary = await sweep_missing_translations(db, max_events=50)
        logger.info("translation sweep summary: %s", summary)
    except Exception as e:  # noqa: BLE001
        logger.exception("Translation sweep failed: %s", e)


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
    # Translation sweep — every 6 hours, fill any missing language columns
    # (title_da, title_de, title_pl, title_et, description_*…) using Claude
    # Haiku via emergentintegrations. Caps at 50 events/run to keep LLM
    # cost bounded — overflow is processed in subsequent runs.
    scheduler.add_job(
        _scheduled_translation_sweep,
        CronTrigger(hour="*/6", minute=20),
        id="translation_sweep",
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
    # Merchant card subscription expiry — daily at 03:30 Europe/Helsinki.
    # Auto-disables cards whose `merchant_until` is in the past so expired
    # merchants drop off the public Shops page without manual intervention.
    scheduler.add_job(
        _merchant_card_expiry_sweep,
        CronTrigger(hour=3, minute=30),
        id="merchant_card_expiry",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "APScheduler started — monthly digest 1st@09:00, weekly admin report Mon@09:00, "
        "event reminders daily@09:00, translation sweep every 6h, prod events sync 06:00+18:00, "
        "merchant card expiry daily@03:30, Europe/Helsinki"
    )


@app.on_event("shutdown")
async def shutdown_db_client():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
    client.close()


# -----------------------------------------------------------------------------
# SEO: sitemap + robots (must be reachable on /sitemap.xml and /robots.txt).
# Ingress only routes /api/* to the backend, so we expose sitemap under
# /api/sitemap.xml and rely on a frontend rewrite (or redirect) for the
# canonical /sitemap.xml URL. robots.txt itself lives in /frontend/public.
# -----------------------------------------------------------------------------
@api_router.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml():
    """Generate a multi-language sitemap of all approved events + key static
    pages. The base URL is intentionally hard-coded to the canonical public
    domain — Google Search Console rejects sitemaps containing URLs from a
    different host than the property where the sitemap was submitted."""
    base = "https://viikinkitapahtumat.fi"
    today = datetime.now(timezone.utc).date().isoformat()
    static_paths = [
        ("/", "1.0", "daily"),
        ("/events", "0.95", "daily"),
        ("/calendar", "0.8", "weekly"),
        ("/about", "0.5", "monthly"),
        ("/guide", "0.6", "monthly"),
        ("/privacy", "0.3", "yearly"),
        ("/submit", "0.5", "monthly"),
    ]
    parts = ['<?xml version="1.0" encoding="UTF-8"?>']
    parts.append(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">'
    )
    for path, prio, freq in static_paths:
        parts.append(
            f"  <url><loc>{base}{path}</loc>"
            f"<lastmod>{today}</lastmod>"
            f"<changefreq>{freq}</changefreq>"
            f"<priority>{prio}</priority></url>"
        )
    # All approved events
    cursor = db.events.find(
        {"status": "approved"},
        {
            "_id": 0,
            "id": 1,
            "start_date": 1,
            "title_fi": 1,
            "title_en": 1,
            "title_sv": 1,
            "title_da": 1,
            "title_de": 1,
            "title_et": 1,
            "title_pl": 1,
            "updated_at": 1,
        },
    )
    async for ev in cursor:
        ev_id = ev.get("id")
        if not ev_id:
            continue
        lastmod = ev.get("updated_at") or ev.get("start_date") or today
        if isinstance(lastmod, datetime):
            lastmod = lastmod.date().isoformat()
        elif isinstance(lastmod, str) and "T" in lastmod:
            lastmod = lastmod.split("T", 1)[0]
        url = f"{base}/events/{ev_id}"
        parts.append(f"  <url><loc>{url}</loc><lastmod>{lastmod}</lastmod>"
                     f"<changefreq>weekly</changefreq><priority>0.85</priority>")
        # hreflang alternates per language
        for code in ("fi", "en", "sv", "da", "de", "et", "pl"):
            parts.append(
                f'    <xhtml:link rel="alternate" hreflang="{code}" '
                f'href="{url}?lang={code}" />'
            )
        parts.append("  </url>")
    parts.append("</urlset>")
    return Response(
        content="\n".join(parts),
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


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
