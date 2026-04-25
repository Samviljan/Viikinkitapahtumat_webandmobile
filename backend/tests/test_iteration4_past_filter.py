"""Iteration 4 tests:
- past-event filtering on GET /api/events and /api/events.ics
- category 'battle' removed from Literal -> 'training_camp'
- image URLs reverted to viikinkitapahtumat.fi
- newsletter preview excludes past events
"""
from datetime import datetime, timezone


class TestPastFilterEvents:
    def test_default_excludes_past_bonk(self, api_client, base_url):
        # Today is past Bonk's end_date 2026-04-05; default GET must NOT include it
        today = datetime.now(timezone.utc).date().isoformat()
        assert today > "2026-04-05", (
            f"Test assumes today > 2026-04-05; got {today}. Past-filter test invalid."
        )
        r = api_client.get(f"{base_url}/api/events")
        assert r.status_code == 200
        titles = [e["title_fi"] for e in r.json()]
        assert "Bonk Pohjalla VII" not in titles
        # Sleipnir (May 21-24, 2026) should still be in default list
        assert "Sleipnir fighting camp, Ulvila" in titles

    def test_include_past_returns_bonk(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events?include_past=true")
        assert r.status_code == 200
        titles = [e["title_fi"] for e in r.json()]
        assert "Bonk Pohjalla VII" in titles

    def test_default_only_future_events(self, api_client, base_url):
        # Every event returned in default list must have end_date (or start_date) >= today
        today = datetime.now(timezone.utc).date().isoformat()
        r = api_client.get(f"{base_url}/api/events")
        for e in r.json():
            edge = e.get("end_date") or e.get("start_date")
            assert edge >= today, f"Past event leaked: {e['title_fi']} {edge}"

    def test_icalendar_excludes_past(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events.ics")
        assert r.status_code == 200
        body = r.text
        assert "Bonk Pohjalla VII" not in body
        # Sleipnir should still appear
        assert "Sleipnir" in body
        # Should still have multiple VEVENTs
        assert body.count("BEGIN:VEVENT") >= 5


class TestTrainingCampCategory:
    def test_training_camp_default_only_sleipnir(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events?category=training_camp")
        assert r.status_code == 200
        titles = [e["title_fi"] for e in r.json()]
        # Bonk past, filtered; only Sleipnir
        assert titles == ["Sleipnir fighting camp, Ulvila"]

    def test_training_camp_with_past_includes_bonk(self, api_client, base_url):
        r = api_client.get(
            f"{base_url}/api/events?category=training_camp&include_past=true"
        )
        assert r.status_code == 200
        titles = sorted(e["title_fi"] for e in r.json())
        assert titles == sorted([
            "Bonk Pohjalla VII",
            "Sleipnir fighting camp, Ulvila",
        ])

    def test_battle_category_no_longer_valid(self, api_client, base_url):
        # 'battle' was removed from EventCategory Literal
        r = api_client.get(f"{base_url}/api/events?category=battle")
        assert r.status_code == 422

    def test_no_event_in_db_has_battle_category(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events?include_past=true")
        cats = {e["category"] for e in r.json()}
        assert "battle" not in cats


class TestImageURLsRestored:
    def test_no_event_uses_event_images_path(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events?include_past=true")
        for e in r.json():
            url = e.get("image_url") or ""
            assert "/event-images/" not in url, (
                f"{e['title_fi']} still uses /event-images/: {url!r}"
            )

    def test_specific_seed_image_urls(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events?include_past=true")
        events = {e["title_fi"]: e for e in r.json()}
        assert (
            events["Sleipnir fighting camp, Ulvila"]["image_url"]
            == "https://viikinkitapahtumat.fi/pics/sleipnir.jpg"
        )
        assert (
            events["Vähänkyrön Viikinkipäivä"]["image_url"]
            == "https://viikinkitapahtumat.fi/pics/vahakyro.jpg"
        )
        assert events["Rosalan viikinkipäivät"]["image_url"] == ""


class TestNewsletterPreviewExcludesPast:
    def test_newsletter_preview_no_bonk(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/newsletter/preview")
        assert r.status_code == 200, r.text
        data = r.json()
        html = data.get("html", "")
        assert "Bonk Pohjalla VII" not in html, "Past event leaked into newsletter"
        # Sleipnir is upcoming within 60 days from today (today >= 2026-04-25)
        # so it should be present
        assert "Sleipnir" in html
