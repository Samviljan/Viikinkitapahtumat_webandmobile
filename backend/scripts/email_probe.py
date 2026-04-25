"""Smoke test for all email flows after domain verification in Resend.

Sends a real email per flow to admin@viikinkitapahtumat.fi (admin) and to a
test recipient also on the verified domain. Reports each Resend outcome.
"""
import asyncio
import os
import sys
from pathlib import Path

ROOT = Path("/app/backend")
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from email_service import (  # noqa: E402
    send_email,
    notify_admin_new_event,
    notify_submitter_decision,
    send_subscribe_confirmation,
    send_monthly_digest,
    send_weekly_admin_report,
    make_unsubscribe_token,
)


ADMIN = os.environ["ADMIN_EMAIL"]
TEST_RECIPIENT = ADMIN  # safest: a domain we control

DUMMY_EVENT = {
    "id": "test-id-emailprobe",
    "title_fi": "Sähköpostitestin tapahtuma",
    "title_en": "",
    "title_sv": "",
    "description_fi": "Tämä on automaattinen testi siitä, että sähköpostit lähtevät Resendistä viikinkitapahtumat.fi-domainilta.",
    "description_en": "",
    "description_sv": "",
    "category": "meetup",
    "location": "Helsinki",
    "start_date": "2027-01-01",
    "end_date": None,
    "organizer": "Email Test Crew",
    "organizer_email": ADMIN,
    "link": "https://viikinkitapahtumat.fi",
    "image_url": "",
    "status": "approved",
}


def _short(res):
    if not isinstance(res, dict):
        return repr(res)
    if res.get("sent"):
        return f"OK id={res.get('id', '?')}"
    return f"FAIL reason={res.get('reason', '?')}"


async def main():
    print(f"Sender:    {os.environ.get('SENDER_EMAIL')}")
    print(f"Test recv: {TEST_RECIPIENT}")
    print("-" * 60)

    # 1) Plain send_email
    r = await send_email(
        TEST_RECIPIENT,
        "[probe 1/5] Resend smoke test — plain send",
        "<p>Tämä on yksinkertainen tekninen testi Resendin yhteydestä.</p>",
    )
    print(f"1) plain send_email  -> {_short(r)}")

    # 2) Admin notification (new event)
    r = await notify_admin_new_event(DUMMY_EVENT)
    print(f"2) admin new-event   -> {_short(r)}")

    # 3) Submitter decision (approved)
    r = await notify_submitter_decision(DUMMY_EVENT, approved=True)
    print(f"3) submitter approve -> {_short(r)}")

    # 4) Subscribe confirmation
    r = await send_subscribe_confirmation(TEST_RECIPIENT, make_unsubscribe_token())
    print(f"4) subscribe confirm -> {_short(r)}")

    # 5) Weekly admin report
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    r = await send_weekly_admin_report(db)
    print(f"5) weekly admin rpt  -> {_short(r)}")

    # 6) Monthly digest — only sends to active subscribers
    r = await send_monthly_digest(db, days=60)
    print(f"6) monthly digest    -> recipients={r['recipients']} sent={r['sent']} events={r['events_in_digest']}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
