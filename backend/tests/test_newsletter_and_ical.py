"""Iteration 3 backend tests: newsletter, iCal, admin email background task,
admin stats subscribers field, and that all 12 seeded events have AI image_url
served from the frontend public/event-images/ folder.
"""
import os
import re
import time
import uuid
import requests
import pytest

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@viikinkitapahtumat.fi")
# Admin password is NEVER hardcoded. Export TEST_ADMIN_PASSWORD to run tests.
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD")
assert ADMIN_PASSWORD, "TEST_ADMIN_PASSWORD env var is required to run tests"

# The frontend domain serves /event-images/<slug>.png
FRONTEND_DOMAIN = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
# Backend public site (used by ical / unsubscribe redirect)
PUBLIC_SITE_URL = "https://events-refresh-1.preview.emergentagent.com"


# ---------- iCal feed ----------
class TestICalFeed:
    def test_ical_returns_valid_calendar(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events.ics")
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "").lower()
        assert "text/calendar" in ct, ct
        body = r.text
        assert body.startswith("BEGIN:VCALENDAR")
        assert "END:VCALENDAR" in body
        assert "VERSION:2.0" in body
        assert "PRODID:" in body
        # Should contain at least the seeded approved events
        assert body.count("BEGIN:VEVENT") >= 1
        assert body.count("BEGIN:VEVENT") == body.count("END:VEVENT")

    def test_ical_event_fields(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events.ics")
        body = r.text
        assert "DTSTART;VALUE=DATE:" in body
        assert "DTEND;VALUE=DATE:" in body
        assert "SUMMARY:" in body
        assert "UID:" in body
        # UID format
        assert re.search(r"UID:[^\r\n]+@viikinkitapahtumat\.fi", body)


# ---------- Newsletter subscribe / unsubscribe ----------
@pytest.fixture
def fresh_email():
    return f"test+{uuid.uuid4().hex[:10]}@example.com"


class TestNewsletterSubscribe:
    def test_subscribe_new_email(self, api_client, admin_client, base_url, fresh_email):
        r = api_client.post(
            f"{base_url}/api/newsletter/subscribe",
            json={"email": fresh_email, "lang": "fi"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data == {"ok": True}
        # verify presence in admin/subscribers (token must NOT be exposed)
        r2 = admin_client.get(f"{base_url}/api/admin/subscribers")
        assert r2.status_code == 200
        subs = r2.json()
        match = [s for s in subs if s.get("email") == fresh_email]
        assert len(match) == 1
        s = match[0]
        assert s["status"] == "active"
        assert "unsubscribe_token" not in s
        assert "_id" not in s
        assert "id" in s

    def test_subscribe_duplicate_returns_already(self, api_client, base_url, fresh_email):
        r1 = api_client.post(
            f"{base_url}/api/newsletter/subscribe",
            json={"email": fresh_email},
        )
        assert r1.status_code == 200
        # second call -> already
        r2 = api_client.post(
            f"{base_url}/api/newsletter/subscribe",
            json={"email": fresh_email},
        )
        assert r2.status_code == 200
        data = r2.json()
        assert data.get("ok") is True
        assert data.get("already") is True

    def test_subscribe_invalid_email(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/newsletter/subscribe",
            json={"email": "not-an-email"},
        )
        assert r.status_code in (400, 422)

    def test_unsubscribe_valid_token(self, api_client, admin_client, base_url, fresh_email):
        # subscribe
        api_client.post(
            f"{base_url}/api/newsletter/subscribe",
            json={"email": fresh_email},
        )
        # fetch token directly from DB via a back-channel: we can't read the token
        # from /admin/subscribers (it's redacted). Use a direct mongo client.
        from pymongo import MongoClient
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        sub = mc[os.environ.get("DB_NAME", "viikinki_db")].newsletter_subscribers.find_one(
            {"email": fresh_email}
        )
        assert sub is not None
        token = sub["unsubscribe_token"]
        assert isinstance(token, str) and len(token) > 8
        # call unsubscribe (do NOT follow redirects so we can inspect Location)
        r = requests.get(
            f"{base_url}/api/newsletter/unsubscribe",
            params={"token": token},
            allow_redirects=False,
            timeout=20,
        )
        assert r.status_code in (302, 303, 307)
        loc = r.headers.get("location", "")
        assert "unsub=ok" in loc, loc
        # status flipped
        sub2 = mc[os.environ.get("DB_NAME", "viikinki_db")].newsletter_subscribers.find_one(
            {"email": fresh_email}
        )
        assert sub2["status"] == "unsubscribed"

    def test_unsubscribe_invalid_token(self, api_client, base_url):
        r = requests.get(
            f"{base_url}/api/newsletter/unsubscribe",
            params={"token": "invalid-bogus-token-xyz"},
            allow_redirects=False,
            timeout=20,
        )
        assert r.status_code in (302, 303, 307)
        loc = r.headers.get("location", "")
        assert "unsub=invalid" in loc, loc


# ---------- Admin newsletter send + preview ----------
class TestAdminNewsletter:
    def test_admin_preview(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/newsletter/preview")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "subject" in data
        assert "html" in data
        assert "count" in data
        assert isinstance(data["subject"], str) and len(data["subject"]) > 0
        assert isinstance(data["html"], str) and len(data["html"]) > 0
        assert isinstance(data["count"], int)

    def test_admin_preview_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/admin/newsletter/preview")
        assert r.status_code == 401

    def test_admin_send_newsletter(self, admin_client, api_client, base_url, fresh_email):
        # ensure at least one active subscriber
        api_client.post(
            f"{base_url}/api/newsletter/subscribe",
            json={"email": fresh_email},
        )
        r = admin_client.post(f"{base_url}/api/admin/newsletter/send")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "recipients" in data
        assert "sent" in data
        assert "events_in_digest" in data
        assert isinstance(data["recipients"], int)
        assert isinstance(data["sent"], int)
        assert isinstance(data["events_in_digest"], int)
        assert data["recipients"] >= 1

    def test_admin_send_requires_auth(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/admin/newsletter/send")
        assert r.status_code == 401

    def test_admin_subscribers_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/admin/subscribers")
        assert r.status_code == 401


# ---------- /api/admin/stats now has subscribers ----------
class TestAdminStatsSubscribers:
    def test_stats_has_subscribers_field(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/stats")
        assert r.status_code == 200
        data = r.json()
        assert "subscribers" in data
        assert isinstance(data["subscribers"], int)
        assert data["subscribers"] >= 0


# ---------- Background admin notification on submit ----------
class TestNotifyAdminBackground:
    def test_submit_event_returns_201_even_if_email_fails(self, api_client, admin_client, base_url):
        payload = {
            "title_fi": f"TEST_NotifyEvent_{uuid.uuid4().hex[:6]}",
            "description_fi": "kuvaus",
            "category": "other",
            "location": "Helsinki",
            "start_date": "2026-09-01",
            "organizer": "TEST_Org",
            "organizer_email": "throwaway-not-verified@example.com",
        }
        r = api_client.post(f"{base_url}/api/events", json=payload)
        assert r.status_code == 201, r.text
        ev_id = r.json()["id"]
        # response not blocked by background task
        # cleanup
        admin_client.delete(f"{base_url}/api/admin/events/{ev_id}")


# ---------- Seeded events have image_url + images served by frontend ----------
# Titles match exactly what is currently seeded in the DB.
EXPECTED_TITLES = {
    "Bonk Pohjalla VII",
    "Hämeen Keskiaikafestivaali",
    "Helsingin Keskiaikapäivä",
    "Keskiajan Turku",
    "Rautakauden Birckala",
    "Rosalan viikinkipäivät",
    "Saltvik Viking Market",
    "Sleipnir fighting camp, Ulvila",
    "Tarinoiden Tori",
    "Ulvilan Keskiaikaiset Hansamarkkinat",
    "Vähänkyrön Viikinkipäivä",
    "Wiipurintien markkinat",
}


class TestSeededEventImages:
    def test_all_seeded_events_have_image_url(self, api_client, base_url):
        # Iter 4: image_urls reverted to viikinkitapahtumat.fi. Rosala has empty image.
        r = api_client.get(f"{base_url}/api/events?include_past=true")
        assert r.status_code == 200
        events = r.json()
        seeded = [e for e in events if e.get("title_fi") in EXPECTED_TITLES]
        assert len(seeded) == 12, f"Expected 12 seeded events, got {len(seeded)}"
        with_image = 0
        for ev in seeded:
            url = ev.get("image_url") or ""
            # MUST NOT use /event-images/ path anymore
            assert "/event-images/" not in url, f"{ev['title_fi']} still uses /event-images/: {url}"
            if url:
                assert url.startswith("https://viikinkitapahtumat.fi/pics/"), (
                    f"{ev['title_fi']} -> {url!r}"
                )
                with_image += 1
        # 11 of 12 have an image url; Rosala intentionally empty
        assert with_image == 11, f"Expected 11 events with image_url, got {with_image}"

    def test_sleipnir_image_specifics(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events?include_past=true")
        events = {e["title_fi"]: e for e in r.json()}
        s = events["Sleipnir fighting camp, Ulvila"]
        assert s["image_url"] == "https://viikinkitapahtumat.fi/pics/sleipnir.jpg"
        v = events["Vähänkyrön Viikinkipäivä"]
        assert v["image_url"] == "https://viikinkitapahtumat.fi/pics/vahakyro.jpg"
        rosala = events["Rosalan viikinkipäivät"]
        assert rosala["image_url"] == ""


# ---------- Cleanup ----------
def test_zz_cleanup_test_subscribers():
    """Best-effort: drop any TEST_ created subscribers by deleting docs whose
    email contains 'test+' that we created during this run."""
    from pymongo import MongoClient
    mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    coll = mc[os.environ.get("DB_NAME", "viikinki_db")].newsletter_subscribers
    coll.delete_many({"email": {"$regex": r"^test\+.*@example\.com$"}})
