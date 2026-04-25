"""Iteration 2 tests: verify 12 seeded events exist as approved with audience+fight_style,
and that public POST /api/events accepts and persists audience+fight_style.
"""
import pytest

EXPECTED_TITLES = [
    "Bonk Pohjalla VII",
    "Sleipnir fighting camp, Ulvila",
    "Vähänkyrön Viikinkipäivä",
    "Hämeen Keskiaikafestivaali",
    "Keskiajan Turku",
    "Rautakauden Birckala",
    "Rosalan viikinkipäivät",
    "Saltvik Viking Market",
    "Tarinoiden Tori",
    "Ulvilan Keskiaikaiset Hansamarkkinat",
    "Wiipurintien markkinat",
    "Helsingin Keskiaikapäivä",
]


class TestSeededEvents:
    def test_all_12_seeded_titles_present_and_approved(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events")
        assert r.status_code == 200, r.text
        events = r.json()
        titles = [e["title_fi"] for e in events]
        for expected in EXPECTED_TITLES:
            assert expected in titles, f"Seeded title missing: {expected}"
        # All seeded events should have status=approved (since GET /api/events filters approved)
        for e in events:
            assert e["status"] == "approved"

    def test_bonk_audience_and_fight_style(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events")
        events = {e["title_fi"]: e for e in r.json()}
        bonk = events.get("Bonk Pohjalla VII")
        assert bonk is not None
        assert bonk["audience"] == "Harrastajat"
        assert bonk["fight_style"] == "Eastern"
        assert bonk["category"] == "battle"
        assert bonk["start_date"] == "2026-04-03"

    def test_vahakyro_audience_and_fight_style(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events")
        events = {e["title_fi"]: e for e in r.json()}
        v = events.get("Vähänkyrön Viikinkipäivä")
        assert v is not None
        assert v["audience"] == "Yleisö"
        assert v["fight_style"] == "Western"

    def test_seeded_events_have_audience_and_fight_style_fields(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events")
        events = {e["title_fi"]: e for e in r.json()}
        for title in EXPECTED_TITLES:
            ev = events.get(title)
            assert ev is not None, f"Missing {title}"
            # Field must exist (may be empty for some)
            assert "audience" in ev
            assert "fight_style" in ev

    def test_seed_no_internal_seed_slug_leaked(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events")
        for e in r.json():
            assert "seed_slug" not in e
            assert "_id" not in e

    def test_calendar_range_april_to_august_2026(self, api_client, base_url):
        r = api_client.get(
            f"{base_url}/api/events?from=2026-04-01&to=2026-08-31"
        )
        assert r.status_code == 200
        titles = [e["title_fi"] for e in r.json()]
        # All 12 seeded events fall within April-August 2026
        for expected in EXPECTED_TITLES:
            assert expected in titles


class TestSubmitNewFields:
    def test_submit_with_audience_and_fight_style(self, api_client, admin_client, base_url):
        payload = {
            "title_fi": "TEST_AudienceFightStyle",
            "description_fi": "kuvaus",
            "category": "battle",
            "location": "Tampere",
            "start_date": "2026-09-15",
            "organizer": "TEST_Org_AF",
            "audience": "Harrastajat",
            "fight_style": "Eastern",
        }
        r = api_client.post(f"{base_url}/api/events", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["status"] == "pending"
        assert data["audience"] == "Harrastajat"
        assert data["fight_style"] == "Eastern"
        ev_id = data["id"]

        # Approve and verify visible publicly with fields persisted
        admin_client.patch(
            f"{base_url}/api/admin/events/{ev_id}",
            json={"status": "approved"},
        )
        r2 = api_client.get(f"{base_url}/api/events/{ev_id}")
        assert r2.status_code == 200
        out = r2.json()
        assert out["audience"] == "Harrastajat"
        assert out["fight_style"] == "Eastern"
        # Cleanup
        admin_client.delete(f"{base_url}/api/admin/events/{ev_id}")

    def test_submit_without_audience_fight_style_defaults_to_empty(self, api_client, base_url):
        payload = {
            "title_fi": "TEST_NoAudience",
            "description_fi": "kuvaus",
            "category": "other",
            "location": "Vantaa",
            "start_date": "2026-10-01",
            "organizer": "TEST_Org_NA",
        }
        r = api_client.post(f"{base_url}/api/events", json=payload)
        assert r.status_code == 201
        data = r.json()
        assert data.get("audience", "") == ""
        assert data.get("fight_style", "") == ""

    def test_seed_slug_is_ignored_on_public_submit(self, api_client, base_url):
        # Public submit must NOT accept seed_slug (extra='ignore')
        payload = {
            "title_fi": "TEST_SeedSlugAttempt",
            "description_fi": "kuvaus",
            "category": "other",
            "location": "X",
            "start_date": "2026-11-01",
            "organizer": "TEST_Org_SS",
            "seed_slug": "malicious::slug::value",
        }
        r = api_client.post(f"{base_url}/api/events", json=payload)
        assert r.status_code == 201
        # Response shouldn't include seed_slug
        assert "seed_slug" not in r.json()
