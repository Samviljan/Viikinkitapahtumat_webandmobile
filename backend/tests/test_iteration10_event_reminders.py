"""Iteration 10: Event reminders + unsubscribe + scheduler service.

Covers:
- POST /api/events/{event_id}/remind happy path & idempotency
- 404 for unknown event
- 404 for pending (non-approved) event
- GET /api/reminders/unsubscribe?token=valid -> 303 + status flips to unsubscribed
- GET /api/reminders/unsubscribe?token=garbage -> 303 with reminder_unsub=invalid
- email_service.send_event_reminders(db, days_ahead=7) returns expected dict shape.
"""
import os
import uuid
import asyncio
import pytest
import requests


# Helpers ---------------------------------------------------------------


def _make_event_payload(suffix: str, status_hint: str = "approved") -> dict:
    return {
        "title_fi": f"TEST_iter10_event_{suffix}",
        "description_fi": "iter10 reminder test",
        "category": "meetup",
        "location": "Helsinki",
        "start_date": "2099-06-01",
        "end_date": "2099-06-02",
        "organizer": "TEST org",
        "organizer_email": "test@example.com",
        "link": "https://example.com",
        "image_url": "",
    }


@pytest.fixture
def approved_event(base_url, api_client, admin_client):
    """Create + approve an event; cleanup after."""
    suffix = uuid.uuid4().hex[:8]
    r = api_client.post(
        f"{base_url}/api/events", json=_make_event_payload(suffix), timeout=15
    )
    assert r.status_code == 201, r.text
    eid = r.json()["id"]
    r2 = admin_client.patch(
        f"{base_url}/api/admin/events/{eid}",
        json={"status": "approved"},
        timeout=15,
    )
    assert r2.status_code == 200, r2.text
    yield eid
    # Cleanup event + any reminder docs
    admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=15)


@pytest.fixture
def pending_event(base_url, api_client, admin_client):
    """Create event but DO NOT approve."""
    suffix = uuid.uuid4().hex[:8]
    r = api_client.post(
        f"{base_url}/api/events", json=_make_event_payload(suffix), timeout=15
    )
    assert r.status_code == 201, r.text
    eid = r.json()["id"]
    yield eid
    admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=15)


# Reminder POST -----------------------------------------------------------


class TestReminderCreate:
    def test_create_reminder_ok(self, base_url, api_client, approved_event):
        email = f"TEST_iter10_{uuid.uuid4().hex[:8]}@example.com"
        r = api_client.post(
            f"{base_url}/api/events/{approved_event}/remind",
            json={"email": email, "lang": "fi"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        # First call must NOT have already=true
        assert body.get("already") in (None, False)

    def test_create_reminder_idempotent(self, base_url, api_client, approved_event):
        email = f"TEST_iter10_{uuid.uuid4().hex[:8]}@example.com"
        url = f"{base_url}/api/events/{approved_event}/remind"
        r1 = api_client.post(url, json={"email": email, "lang": "fi"}, timeout=20)
        assert r1.status_code == 200, r1.text
        r2 = api_client.post(url, json={"email": email, "lang": "fi"}, timeout=20)
        assert r2.status_code == 200, r2.text
        body2 = r2.json()
        assert body2.get("ok") is True
        assert body2.get("already") is True

    def test_create_reminder_unknown_event_404(self, base_url, api_client):
        r = api_client.post(
            f"{base_url}/api/events/{uuid.uuid4()}/remind",
            json={"email": "TEST_iter10_404@example.com", "lang": "fi"},
            timeout=15,
        )
        assert r.status_code == 404, r.text

    def test_create_reminder_pending_event_404(
        self, base_url, api_client, pending_event
    ):
        r = api_client.post(
            f"{base_url}/api/events/{pending_event}/remind",
            json={"email": "TEST_iter10_pending@example.com", "lang": "fi"},
            timeout=15,
        )
        assert r.status_code == 404, r.text


# Unsubscribe -------------------------------------------------------------


class TestUnsubscribe:
    def _create_and_get_token(self, base_url, api_client, admin_client, event_id, email):
        r = api_client.post(
            f"{base_url}/api/events/{event_id}/remind",
            json={"email": email, "lang": "fi"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        # Pull token via direct mongo query is not available over HTTP.
        # Use the unsubscribe endpoint with bogus token to exercise invalid path,
        # then use direct db access for the valid path via motor.
        return None

    def test_unsubscribe_invalid_token(self, base_url, api_client):
        # Use a session that doesn't follow redirects
        s = requests.Session()
        r = s.get(
            f"{base_url}/api/reminders/unsubscribe",
            params={"token": "garbage_token_does_not_exist"},
            allow_redirects=False,
            timeout=15,
        )
        assert r.status_code == 303, f"expected 303, got {r.status_code}"
        loc = r.headers.get("Location", "")
        assert "reminder_unsub=invalid" in loc, loc

    def test_unsubscribe_valid_token_via_db(
        self, base_url, api_client, approved_event
    ):
        """Create reminder via API, fetch token straight from Mongo, hit unsubscribe."""
        from motor.motor_asyncio import AsyncIOMotorClient

        raw_email = f"TEST_iter10_unsub_{uuid.uuid4().hex[:8]}@example.com"
        email = raw_email.lower()  # backend lowercases on store
        r = api_client.post(
            f"{base_url}/api/events/{approved_event}/remind",
            json={"email": raw_email, "lang": "fi"},
            timeout=20,
        )
        assert r.status_code == 200, r.text

        async def _fetch_and_assert():
            mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
            db_name = os.environ.get("DB_NAME", "viikinki_db")
            client = AsyncIOMotorClient(mongo_url)
            try:
                doc = await client[db_name].event_reminders.find_one(
                    {"event_id": approved_event, "email": email}
                )
                assert doc is not None, "reminder doc not persisted"
                assert doc.get("status") == "active"
                assert doc.get("sent_at") is None
                assert doc.get("unsubscribe_token")
                token = doc["unsubscribe_token"]

                # Hit unsubscribe
                s = requests.Session()
                r2 = s.get(
                    f"{base_url}/api/reminders/unsubscribe",
                    params={"token": token},
                    allow_redirects=False,
                    timeout=15,
                )
                assert r2.status_code == 303
                loc = r2.headers.get("Location", "")
                assert "reminder_unsub=ok" in loc, loc

                # Verify status flipped
                doc2 = await client[db_name].event_reminders.find_one(
                    {"event_id": approved_event, "email": email}
                )
                assert doc2.get("status") == "unsubscribed"

                # Cleanup test reminder doc
                await client[db_name].event_reminders.delete_many(
                    {"email": {"$regex": "^TEST_iter10_"}}
                )
            finally:
                client.close()

        asyncio.get_event_loop().run_until_complete(_fetch_and_assert())


# Scheduler service direct call ------------------------------------------


class TestSendEventRemindersService:
    def test_send_event_reminders_returns_shape(self):
        """Direct call to email_service.send_event_reminders(db, days_ahead=7).

        With days_ahead=7 we expect events count == 0 since seeded events do not
        start exactly 7 days from today. Just assert dict shape + no exception.
        """
        import sys
        sys.path.insert(0, "/app/backend")
        from motor.motor_asyncio import AsyncIOMotorClient
        from email_service import send_event_reminders  # type: ignore

        async def _run():
            mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
            db_name = os.environ.get("DB_NAME", "viikinki_db")
            client = AsyncIOMotorClient(mongo_url)
            try:
                db = client[db_name]
                res = await send_event_reminders(db, days_ahead=7)
                assert isinstance(res, dict)
                for key in ("target_date", "events", "sent", "skipped"):
                    assert key in res, f"missing key {key} in {res}"
                assert isinstance(res["events"], int)
                assert isinstance(res["sent"], int)
                assert isinstance(res["skipped"], int)
                return res
            finally:
                client.close()

        result = asyncio.get_event_loop().run_until_complete(_run())
        # Smoke: no events 7 days out today (seed/test data uses future-far dates)
        assert result["events"] >= 0
