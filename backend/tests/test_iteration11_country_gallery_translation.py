"""Iter 11 backend tests — country dropdown, gallery, auto-translation.

Covers:
- GET /api/events: every doc exposes `country` (default 'FI') and `gallery` (default []).
- POST /api/events with only Finnish content -> background translation fills
  title_en/title_sv/description_en/description_sv within ~15s.
- PUT /api/admin/events/{id}: persists country + gallery; idempotent overwrite back to FI.
- PUT /api/admin/events/{id}: 422 when country='ZZ' (not in literal list).
"""

import time
import uuid

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _create_pending_event(api_client, base_url, title_fi: str, description_fi: str) -> str:
    """POST /api/events with only Finnish content. Returns the new event id."""
    payload = {
        "title_fi": title_fi,
        "title_en": "",
        "title_sv": "",
        "description_fi": description_fi,
        "description_en": "",
        "description_sv": "",
        "category": "other",
        "location": "TEST_iter11_location",
        "start_date": "2099-12-01",
        "organizer": "TEST_iter11_organizer",
        "organizer_email": "test_iter11@example.com",
    }
    r = api_client.post(f"{base_url}/api/events", json=payload, timeout=30)
    assert r.status_code == 201, f"POST /api/events failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["country"] == "FI"
    assert body["gallery"] == []
    return body["id"]


def _approve(admin_client, base_url, event_id: str):
    r = admin_client.patch(
        f"{base_url}/api/admin/events/{event_id}", json={"status": "approved"}, timeout=30
    )
    assert r.status_code == 200, f"approve failed: {r.text}"


def _admin_delete(admin_client, base_url, event_id: str):
    admin_client.delete(f"{base_url}/api/admin/events/{event_id}", timeout=30)


# ---------------------------------------------------------------------------
# Defaults: country + gallery on existing events
# ---------------------------------------------------------------------------
class TestEventDefaults:
    def test_list_events_exposes_country_and_gallery(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/events", timeout=30)
        assert r.status_code == 200
        events = r.json()
        assert isinstance(events, list)
        assert len(events) > 0, "expected approved events in DB"
        for ev in events:
            assert "country" in ev, f"event {ev.get('id')} missing 'country'"
            assert "gallery" in ev, f"event {ev.get('id')} missing 'gallery'"
            assert ev["country"] in ("FI", "SE", "EE", "NO", "DK", "PL", "DE")
            assert isinstance(ev["gallery"], list)


# ---------------------------------------------------------------------------
# Admin PUT: country + gallery persistence + idempotency
# ---------------------------------------------------------------------------
class TestAdminEditCountryGallery:
    @pytest.fixture
    def event_id(self, base_url, api_client, admin_client):
        eid = _create_pending_event(
            api_client,
            base_url,
            title_fi=f"TEST_iter11 maa+galleria {uuid.uuid4().hex[:8]}",
            description_fi="Testikuvaus iteraatio 11 maa ja galleria",
        )
        _approve(admin_client, base_url, eid)
        yield eid
        _admin_delete(admin_client, base_url, eid)

    def test_put_persists_country_and_gallery(self, base_url, admin_client, event_id):
        gallery = ["https://example.com/x.jpg", "https://example.com/y.jpg"]
        payload = {
            "title_fi": "TEST_iter11 PUT",
            "description_fi": "PUT body",
            "category": "other",
            "country": "SE",
            "location": "Stockholm",
            "start_date": "2099-12-01",
            "organizer": "TEST_iter11",
            "gallery": gallery,
        }
        r = admin_client.put(f"{base_url}/api/admin/events/{event_id}", json=payload, timeout=30)
        assert r.status_code == 200, f"PUT failed: {r.text}"
        body = r.json()
        assert body["country"] == "SE"
        assert body["gallery"] == gallery

        # GET to verify persistence
        g = admin_client.get(f"{base_url}/api/events/{event_id}", timeout=30)
        assert g.status_code == 200
        ev = g.json()
        assert ev["country"] == "SE"
        assert ev["gallery"] == gallery

        # Idempotent overwrite back to FI
        payload["country"] = "FI"
        payload["gallery"] = []
        r2 = admin_client.put(f"{base_url}/api/admin/events/{event_id}", json=payload, timeout=30)
        assert r2.status_code == 200
        b2 = r2.json()
        assert b2["country"] == "FI"
        assert b2["gallery"] == []

        g2 = admin_client.get(f"{base_url}/api/events/{event_id}", timeout=30)
        assert g2.json()["country"] == "FI"
        assert g2.json()["gallery"] == []

    def test_put_invalid_country_returns_422(self, base_url, admin_client, event_id):
        payload = {
            "title_fi": "TEST_iter11 invalid country",
            "description_fi": "x",
            "category": "other",
            "country": "ZZ",
            "location": "Wherever",
            "start_date": "2099-12-01",
            "organizer": "TEST_iter11",
        }
        r = admin_client.put(f"{base_url}/api/admin/events/{event_id}", json=payload, timeout=30)
        assert r.status_code == 422, f"expected 422 for invalid country, got {r.status_code}: {r.text}"


# ---------------------------------------------------------------------------
# Auto-translation smoke: POST FI-only -> en/sv populated within ~15s
# ---------------------------------------------------------------------------
class TestAutoTranslation:
    def test_post_event_fi_only_triggers_background_translation(
        self, base_url, api_client, admin_client
    ):
        unique = uuid.uuid4().hex[:8]
        title_fi = f"Iteraatio11 testitapahtuma {unique}"
        description_fi = (
            "Tämä on iteraation yksitoista käännöstesti. "
            "Tapahtumassa on miekkailua, jousiammuntaa ja viikinkikäsitöitä koko perheelle. "
            f"Yksilöivä tunniste {unique}."
        )
        eid = _create_pending_event(api_client, base_url, title_fi, description_fi)
        try:
            # Wait for background translation (allow up to 25s; usually 3-7s)
            translated = None
            for _ in range(30):
                time.sleep(1)
                # Use admin endpoint so we can read pending events
                g = admin_client.get(f"{base_url}/api/admin/events/{eid}", timeout=30)
                if g.status_code != 200:
                    continue
                ev = g.json()
                if (
                    (ev.get("title_en") or "").strip()
                    and (ev.get("title_sv") or "").strip()
                    and (ev.get("description_en") or "").strip()
                    and (ev.get("description_sv") or "").strip()
                ):
                    translated = ev
                    break

            assert translated is not None, (
                "Background translation did not populate title_en/title_sv/"
                "description_en/description_sv within 25s"
            )

            # Validate translation actually happened — translated text should differ
            # from the source Finnish text (proves it isn't just copied verbatim).
            assert translated["title_en"].strip() != title_fi, (
                f"title_en is identical to title_fi (no translation): {translated['title_en']!r}"
            )
            assert translated["title_sv"].strip() != title_fi, (
                f"title_sv is identical to title_fi: {translated['title_sv']!r}"
            )
            assert translated["description_en"].strip() != description_fi, (
                "description_en is identical to description_fi"
            )
            assert translated["description_sv"].strip() != description_fi, (
                "description_sv is identical to description_fi"
            )

            # Title is FI=fi, so en/sv translations must NOT be in Finnish
            # (sanity: they shouldn't contain the unique Finnish phrase 'testitapahtuma')
            assert "testitapahtuma" not in translated["title_en"].lower(), (
                f"title_en still appears Finnish: {translated['title_en']!r}"
            )
        finally:
            _admin_delete(admin_client, base_url, eid)
