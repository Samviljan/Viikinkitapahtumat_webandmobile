"""Iteration 5 — weekly admin report + decision-emails on PATCH."""
import time
import requests


# ----------------- Auth -----------------
class TestAdminAuthGuards:
    def test_weekly_preview_requires_auth(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/admin/weekly-report/preview", timeout=20)
        assert r.status_code in (401, 403)

    def test_weekly_send_requires_auth(self, base_url, api_client):
        r = api_client.post(f"{base_url}/api/admin/weekly-report/send", timeout=20)
        assert r.status_code in (401, 403)


# ----------------- Weekly preview -----------------
class TestWeeklyReportPreview:
    def test_preview_returns_expected_shape(self, base_url, admin_client):
        r = admin_client.get(f"{base_url}/api/admin/weekly-report/preview", timeout=30)
        assert r.status_code == 200
        data = r.json()
        # shape
        for k in ("subject", "html", "stats", "new_subs"):
            assert k in data, f"missing key {k}"
        stats = data["stats"]
        for k in ("pending", "approved", "rejected", "subscribers"):
            assert k in stats, f"missing stats.{k}"
            assert isinstance(stats[k], int)
        assert isinstance(data["new_subs"], int)
        assert isinstance(data["html"], str) and len(data["html"]) > 100

    def test_preview_html_contains_stat_cards(self, base_url, admin_client):
        r = admin_client.get(f"{base_url}/api/admin/weekly-report/preview", timeout=30)
        assert r.status_code == 200
        html = r.json()["html"]
        # The 4 stat-card labels must be present
        assert "Odottaa" in html
        assert "Hyväksytyt" in html
        assert "Tilaajat" in html
        assert "Uudet tilaajat" in html

    def test_preview_subject_starts_with_viikkokatsaus(self, base_url, admin_client):
        r = admin_client.get(f"{base_url}/api/admin/weekly-report/preview", timeout=30)
        assert r.status_code == 200
        assert r.json()["subject"].startswith("Viikkokatsaus")


# ----------------- Weekly send -----------------
class TestWeeklyReportSend:
    def test_send_returns_expected_shape(self, base_url, admin_client):
        r = admin_client.post(f"{base_url}/api/admin/weekly-report/send", timeout=60)
        assert r.status_code == 200
        data = r.json()
        for k in ("to", "stats", "new_subs", "sent"):
            assert k in data, f"missing key {k}"
        assert data["to"] == "admin@viikinkitapahtumat.fi"
        # `sent` is bool (True if Resend accepted, False if config/error)
        assert isinstance(data["sent"], bool)


# ----------------- PATCH triggers decision emails (non-blocking) -----------------
class TestPatchTriggersDecisionEmail:
    @staticmethod
    def _create_event(base_url, organizer_email):
        payload = {
            "title_fi": "TEST_iter5_decision",
            "description_fi": "Test event for decision-email flow",
            "category": "other",
            "location": "Testikatu 1",
            "start_date": "2027-08-15",
            "organizer": "TEST org",
            "organizer_email": organizer_email,
        }
        return requests.post(f"{base_url}/api/events", json=payload, timeout=30)

    def test_patch_approved_with_email_returns_200_fast(self, base_url, admin_client):
        cr = self._create_event(base_url, "test-iter5-approve@example.com")
        assert cr.status_code == 201
        eid = cr.json()["id"]

        t0 = time.time()
        r = admin_client.patch(
            f"{base_url}/api/admin/events/{eid}",
            json={"status": "approved"},
            timeout=10,
        )
        elapsed_ms = (time.time() - t0) * 1000
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == eid
        assert body["status"] == "approved"
        # background task must not block — allow 2000ms generous ceiling for cloud round-trip
        assert elapsed_ms < 2000, f"PATCH too slow: {elapsed_ms:.0f}ms"
        # cleanup
        admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=10)

    def test_patch_rejected_with_email_returns_eventout(self, base_url, admin_client):
        cr = self._create_event(base_url, "test-iter5-reject@example.com")
        assert cr.status_code == 201
        eid = cr.json()["id"]

        r = admin_client.patch(
            f"{base_url}/api/admin/events/{eid}",
            json={"status": "rejected"},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"
        admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=10)

    def test_patch_no_organizer_email_still_succeeds(self, base_url, admin_client):
        # No organizer_email
        payload = {
            "title_fi": "TEST_iter5_noemail",
            "description_fi": "no email",
            "category": "other",
            "location": "Test",
            "start_date": "2027-08-16",
            "organizer": "TEST org",
        }
        cr = requests.post(f"{base_url}/api/events", json=payload, timeout=30)
        assert cr.status_code == 201
        eid = cr.json()["id"]

        r = admin_client.patch(
            f"{base_url}/api/admin/events/{eid}",
            json={"status": "approved"},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "approved"
        admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=10)

    def test_patch_pending_does_not_crash(self, base_url, admin_client):
        cr = self._create_event(base_url, "test-iter5-pending@example.com")
        assert cr.status_code == 201
        eid = cr.json()["id"]
        # First approve, then set back to pending (should NOT trigger any email)
        admin_client.patch(
            f"{base_url}/api/admin/events/{eid}",
            json={"status": "approved"},
            timeout=10,
        )
        r = admin_client.patch(
            f"{base_url}/api/admin/events/{eid}",
            json={"status": "pending"},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "pending"
        admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=10)


# ----------------- Existing flows regression -----------------
class TestExistingFlowsRegression:
    def test_get_events_still_works(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/events", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_monthly_digest_preview_still_works(self, base_url, admin_client):
        r = admin_client.get(f"{base_url}/api/admin/newsletter/preview", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "subject" in d and "html" in d and "count" in d

    def test_ical_feed_still_works(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/events.ics", timeout=30)
        assert r.status_code == 200
        assert "BEGIN:VCALENDAR" in r.text
