from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, BackgroundTasks
from fastapi.responses import PlainTextResponse, RedirectResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

from email_service import (
    notify_admin_new_event,
    send_subscribe_confirmation,
    send_monthly_digest as svc_send_monthly_digest,
    make_unsubscribe_token,
)


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
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
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


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


EventCategory = Literal["market", "battle", "course", "festival", "meetup", "other"]
EventStatus = Literal["pending", "approved", "rejected"]


class EventCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title_fi: str
    title_en: Optional[str] = ""
    title_sv: Optional[str] = ""
    description_fi: str
    description_en: Optional[str] = ""
    description_sv: Optional[str] = ""
    category: EventCategory = "other"
    location: str
    start_date: str
    end_date: Optional[str] = None
    organizer: str
    organizer_email: Optional[EmailStr] = None
    link: Optional[str] = ""
    image_url: Optional[str] = ""
    audience: Optional[str] = ""
    fight_style: Optional[str] = ""


class EventOut(BaseModel):
    id: str
    title_fi: str
    title_en: str
    title_sv: str
    description_fi: str
    description_en: str
    description_sv: str
    category: str
    location: str
    start_date: str
    end_date: Optional[str] = None
    organizer: str
    organizer_email: Optional[str] = None
    link: str
    image_url: str
    status: str
    created_at: str
    audience: Optional[str] = ""
    fight_style: Optional[str] = ""


class EventStatusUpdate(BaseModel):
    status: EventStatus


class SubscribeRequest(BaseModel):
    email: EmailStr
    lang: Optional[str] = "fi"


# -----------------------------------------------------------------------------
# Auth routes
# -----------------------------------------------------------------------------
@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
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
        "token": token,
    }


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# -----------------------------------------------------------------------------
# Public event routes
# -----------------------------------------------------------------------------
def _serialize_event(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "_id"}


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
        "audience": doc.get("audience") or "",
        "fight_style": doc.get("fight_style") or "",
    })
    await db.events.insert_one(doc)
    # Fire-and-forget admin notification
    background.add_task(notify_admin_new_event, _serialize_event(doc))
    return EventOut(**_serialize_event(doc))


@api_router.get("/events", response_model=List[EventOut])
async def list_events(
    category: Optional[EventCategory] = None,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
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
    docs = await db.events.find(q, {"_id": 0}).sort("start_date", 1).to_list(1000)
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
    return EventOut(**res)


@api_router.delete("/admin/events/{event_id}")
async def admin_delete_event(event_id: str, _admin: dict = Depends(get_admin_user)):
    res = await db.events.delete_one({"id": event_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
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

    # APScheduler — 1st of every month at 09:00 Europe/Helsinki
    scheduler = AsyncIOScheduler(timezone=pytz.timezone("Europe/Helsinki"))
    scheduler.add_job(
        _scheduled_monthly_digest,
        CronTrigger(day=1, hour=9, minute=0),
        id="monthly_digest",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started — monthly digest at 09:00 day 1, Europe/Helsinki")


@app.on_event("shutdown")
async def shutdown_db_client():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
    client.close()


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
