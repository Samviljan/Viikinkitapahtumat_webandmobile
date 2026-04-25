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


def render_event_decision(ev: dict, approved: bool) -> tuple[str, str]:
    site = _site_url()
    title = escape(ev.get("title_fi") or "")
    if approved:
        link = f"{site}/events/{ev.get('id')}" if (site and ev.get("id")) else ""
        cta_html = (
            f'<p style="margin-top:24px"><a href="{link}" style="{BTN_STYLE}">Katso julkaistu tapahtuma</a></p>'
            if link
            else ""
        )
        body = (
            f'<div style="{BASE_STYLE}">'
            f'<h1 style="{H1_STYLE}">Tapahtumasi on hyväksytty</h1>'
            f'<div style="{CARD_STYLE}">'
            f"<p>Hei,</p>"
            f"<p>Hienoa! Lähettämäsi tapahtuma <strong>{title}</strong> on hyväksytty ja "
            f"se näkyy nyt sivustomme tapahtumakalenterissa ja kuukausiuutiskirjeessä.</p>"
            f"<p>Kiitos että jaat tapahtumasi viikinkiyhteisön kanssa.</p>"
            f"{cta_html}"
            f"</div></div>"
        )
        subject = f"Hyväksytty: {ev.get('title_fi') or ''}"
    else:
        body = (
            f'<div style="{BASE_STYLE}">'
            f'<h1 style="{H1_STYLE}">Tapahtumailmoituksesi tilanne</h1>'
            f'<div style="{CARD_STYLE}">'
            f"<p>Hei,</p>"
            f"<p>Lähettämääsi tapahtumaa <strong>{title}</strong> ei tällä kertaa julkaistu "
            f"sivustollamme. Tämä voi johtua puutteellisista tiedoista, päällekkäisyydestä toisen "
            f"ilmoituksen kanssa tai siitä, että tapahtuma ei sovi sivuston aihepiiriin.</p>"
            f"<p>Voit lähettää tapahtuman uudestaan tarvittavin täydennyksin tai ottaa yhteyttä "
            f"sähköpostitse osoitteeseen <a href='mailto:{_admin_email()}' style='color:#C19C4D'>"
            f"{_admin_email()}</a>.</p>"
            f"</div></div>"
        )
        subject = f"Tapahtumailmoituksesi: {ev.get('title_fi') or ''}"
    return subject, body


async def notify_submitter_decision(ev: dict, approved: bool) -> dict:
    to = ev.get("organizer_email")
    if not to:
        return {"sent": False, "reason": "no_organizer_email"}
    subject, html = render_event_decision(ev, approved)
    return await send_email(to, subject, html)


def render_weekly_admin_report(stats: dict, pending: list[dict], upcoming: list[dict], new_subs: int) -> tuple[str, str]:
    site = _site_url()
    pending_html = ""
    if pending:
        rows = []
        for ev in pending[:10]:
            title = escape(ev.get("title_fi") or "")
            organizer = escape(ev.get("organizer") or "")
            date = escape(ev.get("start_date") or "")
            rows.append(
                f'<li style="margin-bottom:8px"><strong>{title}</strong> '
                f'<span style="{META_STYLE}"> · {date} · {organizer}</span></li>'
            )
        pending_html = (
            f'<div style="{CARD_STYLE}">'
            f'<h2 style="{H2_STYLE}">Odottaa tarkistusta ({stats["pending"]})</h2>'
            f'<ul style="padding-left:18px;margin:0">{"".join(rows)}</ul>'
            f"</div>"
        )

    upcoming_html = ""
    if upcoming:
        rows = []
        for ev in upcoming[:5]:
            title = escape(ev.get("title_fi") or "")
            date = escape(ev.get("start_date") or "")
            location = escape(ev.get("location") or "")
            rows.append(
                f'<li style="margin-bottom:6px">{title} '
                f'<span style="{META_STYLE}">· {date} · {location}</span></li>'
            )
        upcoming_html = (
            f'<div style="{CARD_STYLE}">'
            f'<h2 style="{H2_STYLE}">Tulevat tapahtumat (seuraavat 5)</h2>'
            f'<ul style="padding-left:18px;margin:0">{"".join(rows)}</ul>'
            f"</div>"
        )

    cta = (
        f'<p style="margin-top:24px"><a href="{site}/admin" style="{BTN_STYLE}">Avaa hallintapaneeli</a></p>'
        if site
        else ""
    )
    body = (
        f'<div style="{BASE_STYLE}">'
        f'<h1 style="{H1_STYLE}">Viikon yhteenveto</h1>'
        f'<p>Hei admin, tässä viikon kooste sivustosi tilasta.</p>'
        f'<div style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0">'
        f'<div style="{CARD_STYLE};flex:1;min-width:140px;text-align:center">'
        f'<div style="{META_STYLE}">Odottaa</div>'
        f'<div style="font-size:32px;color:#8A251D;font-weight:600">{stats["pending"]}</div>'
        f'</div>'
        f'<div style="{CARD_STYLE};flex:1;min-width:140px;text-align:center">'
        f'<div style="{META_STYLE}">Hyväksytyt yhteensä</div>'
        f'<div style="font-size:32px;color:#C19C4D;font-weight:600">{stats["approved"]}</div>'
        f'</div>'
        f'<div style="{CARD_STYLE};flex:1;min-width:140px;text-align:center">'
        f'<div style="{META_STYLE}">Tilaajat</div>'
        f'<div style="font-size:32px;color:#C19C4D;font-weight:600">{stats["subscribers"]}</div>'
        f'</div>'
        f'<div style="{CARD_STYLE};flex:1;min-width:140px;text-align:center">'
        f'<div style="{META_STYLE}">Uudet tilaajat 7 pv</div>'
        f'<div style="font-size:32px;color:#C19C4D;font-weight:600">+{new_subs}</div>'
        f'</div>'
        f'</div>'
        f"{pending_html}"
        f"{upcoming_html}"
        f"{cta}"
        f"</div>"
    )
    return f"Viikkokatsaus — {datetime.now(timezone.utc).strftime('%-d.%-m.%Y')}", body


async def send_weekly_admin_report(db) -> dict:
    pending_count = await db.events.count_documents({"status": "pending"})
    approved_count = await db.events.count_documents({"status": "approved"})
    rejected_count = await db.events.count_documents({"status": "rejected"})
    sub_count = await db.newsletter_subscribers.count_documents({"status": "active"})
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_subs = await db.newsletter_subscribers.count_documents({
        "status": "active",
        "created_at": {"$gte": week_ago},
    })
    pending = await db.events.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    approved = await db.events.find({"status": "approved"}, {"_id": 0}).to_list(2000)
    upcoming = select_upcoming_events(approved, days=30)
    stats = {"pending": pending_count, "approved": approved_count, "rejected": rejected_count, "subscribers": sub_count}
    subject, html = render_weekly_admin_report(stats, pending, upcoming, new_subs)
    res = await send_email(_admin_email(), subject, html)
    return {"to": _admin_email(), "stats": stats, "new_subs": new_subs, **res}


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


def render_reminder_confirmation(ev: dict, email: str, unsub_url: str) -> tuple[str, str]:
    site = _site_url()
    title = escape(ev.get("title_fi") or "")
    date = escape(ev.get("start_date") or "")
    if ev.get("end_date"):
        date = f"{date} – {escape(ev['end_date'])}"
    location = escape(ev.get("location") or "")
    link = f"{site}/events/{ev.get('id')}" if (site and ev.get("id")) else ""
    cta = (
        f'<p style="margin-top:24px"><a href="{link}" style="{BTN_STYLE}">Katso tapahtuma</a></p>'
        if link
        else ""
    )
    body = (
        f'<div style="{BASE_STYLE}">'
        f'<h1 style="{H1_STYLE}">Muistutus tilattu</h1>'
        f'<div style="{CARD_STYLE}">'
        f'<p>Hei,</p>'
        f'<p>Tilauksesi muistutuksesta tapahtumalle <strong>{title}</strong> on '
        f'vastaanotettu osoitteeseen <strong>{escape(email)}</strong>.</p>'
        f'<p style="{META_STYLE}">{date} · {location}</p>'
        f'<p>Lähetämme sinulle muistutuksen sähköpostitse <strong>7 päivää ennen tapahtumaa</strong>.</p>'
        f"{cta}"
        f"</div>"
        f'<p style="{META_STYLE};margin-top:32px;border-top:1px solid #352A23;padding-top:16px">'
        f'Et halua tätä muistutusta? '
        f'<a href="{escape(unsub_url)}" style="color:#A89A82">Peruuta muistutus</a>.'
        f"</p>"
        f"</div>"
    )
    return f"Muistutus tilattu: {ev.get('title_fi') or ''}", body


def render_event_reminder(ev: dict, unsub_url: str) -> tuple[str, str]:
    site = _site_url()
    title = escape(ev.get("title_fi") or "")
    date = escape(ev.get("start_date") or "")
    if ev.get("end_date"):
        date = f"{date} – {escape(ev['end_date'])}"
    location = escape(ev.get("location") or "")
    organizer = escape(ev.get("organizer") or "")
    desc = escape((ev.get("description_fi") or "")[:300])
    link = f"{site}/events/{ev.get('id')}" if (site and ev.get("id")) else ""
    cta = (
        f'<p style="margin-top:24px"><a href="{link}" style="{BTN_STYLE}">Avaa tapahtuma</a></p>'
        if link
        else ""
    )
    body = (
        f'<div style="{BASE_STYLE}">'
        f'<h1 style="{H1_STYLE}">Tapahtumasi viikon päässä</h1>'
        f'<p>Hei! Pyytämäsi muistutus seuraavasta tapahtumasta:</p>'
        f'<div style="{CARD_STYLE}">'
        f'<h2 style="{H2_STYLE}">{title}</h2>'
        f'<p style="{META_STYLE}">{date} · {location} · {organizer}</p>'
        f"<p>{desc}…</p>"
        f"{cta}"
        f"</div>"
        f'<p style="{META_STYLE};margin-top:32px;border-top:1px solid #352A23;padding-top:16px">'
        f'Et halua jatkossa muistutuksia tästä tapahtumasta? '
        f'<a href="{escape(unsub_url)}" style="color:#A89A82">Peruuta muistutus</a>.'
        f"</p>"
        f"</div>"
    )
    return f"Muistutus: {ev.get('title_fi') or ''} viikon päässä", body


def reminder_unsubscribe_url(token: str) -> str:
    site = _site_url()
    if site:
        return f"{site}/api/reminders/unsubscribe?token={token}"
    return f"/api/reminders/unsubscribe?token={token}"


async def send_reminder_confirmation(ev: dict, email: str, token: str) -> dict:
    subject, html = render_reminder_confirmation(ev, email, reminder_unsubscribe_url(token))
    return await send_email(email, subject, html)


async def send_event_reminders(db, days_ahead: int = 7) -> dict:
    """Send reminder emails for events that start exactly `days_ahead` days from today.

    Only sends to active reminders that have not yet been emailed.
    """
    target = (datetime.now(timezone.utc).date() + timedelta(days=days_ahead)).isoformat()
    events = await db.events.find(
        {"status": "approved", "start_date": target}, {"_id": 0}
    ).to_list(500)
    sent = 0
    skipped = 0
    for ev in events:
        reminders = await db.event_reminders.find(
            {"event_id": ev["id"], "status": "active", "sent_at": None}, {"_id": 0}
        ).to_list(10000)
        for rem in reminders:
            subject, html = render_event_reminder(
                ev, reminder_unsubscribe_url(rem["unsubscribe_token"])
            )
            res = await send_email(rem["email"], subject, html)
            if res.get("sent"):
                sent += 1
                await db.event_reminders.update_one(
                    {"id": rem["id"]},
                    {"$set": {"sent_at": datetime.now(timezone.utc).isoformat()}},
                )
            else:
                skipped += 1
    return {"target_date": target, "events": len(events), "sent": sent, "skipped": skipped}


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
