"""Email + newsletter helpers backed by Resend.

If RESEND_API_KEY is empty/unset, falls back to logging the payload so the app
never crashes in dev. All public functions are async and use asyncio.to_thread
to keep the FastAPI event loop non-blocking.
"""

from __future__ import annotations

import asyncio
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from html import escape

from typing import Iterable

import resend

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(os.environ.get("RESEND_API_KEY"))


def _sender() -> str:
    return os.environ.get("SENDER_EMAIL") or "onboarding@resend.dev"


def _site_url() -> str:
    return os.environ.get("PUBLIC_SITE_URL", "").rstrip("/")


def _admin_email() -> str:
    return os.environ.get("ADMIN_EMAIL", "admin@viikinkitapahtumat.fi")


async def send_email(to: str, subject: str, html: str) -> dict:
    """Send a single email. Returns {"sent": bool, "id": ...} or {"sent": False, "reason": ...}."""
    if not _is_configured():
        logger.warning("[email mock] to=%s subject=%s (RESEND_API_KEY not set)", to, subject)
        return {"sent": False, "reason": "no_api_key"}

    api_key = os.environ["RESEND_API_KEY"]
    resend.api_key = api_key
    params = {
        "from": _sender(),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)
        return {"sent": True, "id": email_id}
    except Exception as e:  # noqa: BLE001
        logger.error("Resend send failed to=%s: %s", to, e)
        return {"sent": False, "reason": str(e)}


# -----------------------------------------------------------------------------
# Templates
# -----------------------------------------------------------------------------
BASE_STYLE = (
    "font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; "
    "color: #E6D5B8; background-color: #110E0C; padding: 24px; line-height: 1.55;"
)
CARD_STYLE = (
    "background-color: #1E1815; border: 1px solid #352A23; padding: 24px; "
    "border-radius: 4px; margin-bottom: 16px;"
)
H1_STYLE = "font-size: 26px; font-weight: 600; margin: 0 0 12px; color: #E6D5B8;"
H2_STYLE = "font-size: 20px; margin: 16px 0 8px; color: #C19C4D;"
BTN_STYLE = (
    "display: inline-block; background-color: #8A251D; color: #E6D5B8; "
    "padding: 12px 24px; text-decoration: none; border-radius: 4px; "
    "font-weight: 600; letter-spacing: 0.1em;"
)
META_STYLE = "color: #A89A82; font-size: 13px;"


def _render_event_block(ev: dict) -> str:
    title = escape(ev.get("title_fi") or "")
    date = escape(ev.get("start_date") or "")
    end_date = ev.get("end_date")
    if end_date:
        date = f"{date} – {escape(end_date)}"
    location = escape(ev.get("location") or "")
    organizer = escape(ev.get("organizer") or "")
    desc = escape((ev.get("description_fi") or "")[:240])
    site = _site_url()
    link = f"{site}/events/{ev.get('id')}" if ev.get("id") and site else ""
    link_html = (
        f'<p><a href="{link}" style="color:#C19C4D">Katso tapahtuma →</a></p>' if link else ""
    )
    return (
        f'<div style="{CARD_STYLE}">'
        f'<h2 style="{H2_STYLE}">{title}</h2>'
        f'<p style="{META_STYLE}">{date} · {location} · {organizer}</p>'
        f"<p>{desc}…</p>"
        f"{link_html}"
        f"</div>"
    )


def render_admin_notification(ev: dict) -> tuple[str, str]:
    site = _site_url()
    admin_link = f"{site}/admin" if site else ""
    title = escape(ev.get("title_fi") or "(no title)")
    organizer = escape(ev.get("organizer") or "")
    location = escape(ev.get("location") or "")
    date = escape(ev.get("start_date") or "")
    if ev.get("end_date"):
        date = f"{date} – {escape(ev['end_date'])}"
    organizer_email = escape(ev.get("organizer_email") or "—")
    link_html = (
        f'<p style="margin-top:24px"><a href="{admin_link}" style="{BTN_STYLE}">Avaa hallintapaneeli</a></p>'
        if admin_link
        else ""
    )
    body = (
        f'<div style="{BASE_STYLE}">'
        f'<h1 style="{H1_STYLE}">Uusi tapahtumailmoitus</h1>'
        f'<div style="{CARD_STYLE}">'
        f'<h2 style="{H2_STYLE}">{title}</h2>'
        f'<p style="{META_STYLE}">{date} · {location}</p>'
        f"<p><strong>Järjestäjä:</strong> {organizer}</p>"
        f"<p><strong>Yhteyssähköposti:</strong> {organizer_email}</p>"
        f"</div>"
        f"<p>Avaa hallintapaneeli hyväksyäksesi tai hylätäksesi tapahtuman.</p>"
        f"{link_html}"
        f"</div>"
    )
    return f"Uusi tapahtumailmoitus: {ev.get('title_fi') or ''}", body


def render_subscribe_confirm(email: str, unsubscribe_url: str) -> tuple[str, str]:
    body = (
        f'<div style="{BASE_STYLE}">'
        f'<h1 style="{H1_STYLE}">Tervetuloa!</h1>'
        f'<div style="{CARD_STYLE}">'
        f'<p>Hei,</p>'
        f'<p>Olet tilannut Viikinkitapahtumat-uutiskirjeen osoitteeseen <strong>{escape(email)}</strong>. '
        f'Lähetämme sinulle kuukausittain yhteenvedon tulevista viikinki-, rauta-aika- ja '
        f'varhaiskeskiaikatapahtumista Suomessa.</p>'
        f'<p style="{META_STYLE}">Voit perua tilauksen milloin tahansa: '
        f'<a href="{escape(unsubscribe_url)}" style="color:#C19C4D">peruuta tilaus</a>.</p>'
        f"</div></div>"
    )
    return "Tervetuloa Viikinkitapahtumat-uutiskirjeeseen", body


def render_monthly_digest(events: list[dict], unsubscribe_url: str) -> tuple[str, str]:
    if not events:
        intro = "<p>Tämän kuukauden katsauksessa ei ole vielä uusia tapahtumia. Tule käymään sivuillamme uudestaan!</p>"
        events_html = ""
    else:
        intro = (
            f"<p>Hei! Tässä on tulevat <strong>{len(events)}</strong> viikinkitapahtumaa "
            f"seuraavien viikkojen aikana:</p>"
        )
        events_html = "".join(_render_event_block(e) for e in events)

    site = _site_url()
    cta = (
        f'<p style="margin-top:24px"><a href="{site}/events" style="{BTN_STYLE}">Avaa kalenteri</a></p>'
        if site
        else ""
    )
    body = (
        f'<div style="{BASE_STYLE}">'
        f'<h1 style="{H1_STYLE}">Kuukauden viikinkitapahtumat</h1>'
        f"{intro}"
        f"{events_html}"
        f"{cta}"
        f'<p style="{META_STYLE};margin-top:32px;border-top:1px solid #352A23;padding-top:16px">'
        f'Et halua enää saada näitä viestejä? '
        f'<a href="{escape(unsubscribe_url)}" style="color:#A89A82">Peruuta tilaus</a>.'
        f"</p>"
        f"</div>"
    )
    today = datetime.now(timezone.utc).strftime("%-m/%Y")
    return f"Viikinkitapahtumat — kuukausikatsaus {today}", body


# -----------------------------------------------------------------------------
# High-level senders (operate against a Mongo db handle)
# -----------------------------------------------------------------------------
async def notify_admin_new_event(ev: dict) -> dict:
    subject, html = render_admin_notification(ev)
    return await send_email(_admin_email(), subject, html)


def make_unsubscribe_token() -> str:
    return secrets.token_urlsafe(32)


def unsubscribe_url(token: str) -> str:
    site = _site_url()
    if site:
        return f"{site}/unsubscribe?token={token}"
    return f"/unsubscribe?token={token}"


async def send_subscribe_confirmation(email: str, token: str) -> dict:
    subject, html = render_subscribe_confirm(email, unsubscribe_url(token))
    return await send_email(email, subject, html)


def select_upcoming_events(all_events: Iterable[dict], days: int = 60) -> list[dict]:
    today = datetime.now(timezone.utc).date()
    horizon = today + timedelta(days=days)
    out = []
    for e in all_events:
        try:
            start = datetime.fromisoformat(e["start_date"]).date()
        except Exception:  # noqa: BLE001
            continue
        if today <= start <= horizon:
            out.append(e)
    out.sort(key=lambda x: x.get("start_date", ""))
    return out


async def send_monthly_digest(db, days: int = 60) -> dict:
    """Send a digest of upcoming events to all active subscribers.

    Returns {"recipients": N, "sent": M}.
    """
    events = await db.events.find({"status": "approved"}, {"_id": 0}).to_list(2000)
    upcoming = select_upcoming_events(events, days=days)
    subscribers = await db.newsletter_subscribers.find(
        {"status": "active"}, {"_id": 0}
    ).to_list(10000)
    sent = 0
    for sub in subscribers:
        subject, html = render_monthly_digest(upcoming, unsubscribe_url(sub["unsubscribe_token"]))
        res = await send_email(sub["email"], subject, html)
        if res.get("sent"):
            sent += 1
    return {"recipients": len(subscribers), "sent": sent, "events_in_digest": len(upcoming)}
