"""Iter 7 backend tests: PUT admin event edit, merchants & guilds CRUD."""
import uuid
import pytest


# ---- Public endpoints ----
class TestPublicMerchantsGuilds:
    def test_get_merchants_public(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/merchants", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 19, f"expected >=19 merchants, got {len(data)}"
        # category-then-order_index sorted (gear before smith alphabetically)
        cats = [d["category"] for d in data]
        assert cats == sorted(cats), "merchants not sorted by category"
        # required fields
        for d in data:
            assert set(["id", "name", "description", "url", "category", "order_index"]).issubset(d.keys())
            assert d["category"] in ("gear", "smith")
        gear = [d for d in data if d["category"] == "gear"]
        smiths = [d for d in data if d["category"] == "smith"]
        assert len(gear) >= 17
        assert len(smiths) >= 2

    def test_get_guilds_public(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/guilds", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 21
        for d in data:
            assert set(["id", "name", "region", "url", "category", "order_index"]).issubset(d.keys())
            assert d["category"] in ("svtl_member", "other")
        svtl = [d for d in data if d["category"] == "svtl_member"]
        other = [d for d in data if d["category"] == "other"]
        assert len(svtl) >= 6
        assert len(other) >= 15


# ---- Auth enforcement ----
class TestAdminAuthEnforcement:
    def test_post_merchant_unauth(self, base_url, api_client):
        r = api_client.post(f"{base_url}/api/admin/merchants", json={"name": "TEST_x"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_put_merchant_unauth(self, base_url, api_client):
        r = api_client.put(f"{base_url}/api/admin/merchants/abc", json={"name": "TEST_x"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_delete_merchant_unauth(self, base_url, api_client):
        r = api_client.delete(f"{base_url}/api/admin/merchants/abc", timeout=15)
        assert r.status_code in (401, 403)

    def test_post_guild_unauth(self, base_url, api_client):
        r = api_client.post(f"{base_url}/api/admin/guilds", json={"name": "TEST_x"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_put_event_unauth(self, base_url, api_client):
        r = api_client.put(
            f"{base_url}/api/admin/events/some-id",
            json={"title_fi": "x", "description_fi": "x", "location": "x", "start_date": "2026-01-01", "organizer": "x"},
            timeout=15,
        )
        assert r.status_code in (401, 403)


# ---- Merchant CRUD ----
class TestMerchantCRUD:
    def test_merchant_full_lifecycle(self, base_url, admin_client, api_client):
        suffix = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_merchant_{suffix}",
            "description": "test desc",
            "url": "https://example.com",
            "category": "gear",
            "order_index": 99,
        }
        # CREATE
        r = admin_client.post(f"{base_url}/api/admin/merchants", json=payload, timeout=15)
        assert r.status_code == 201, r.text
        created = r.json()
        assert created["name"] == payload["name"]
        assert created["category"] == "gear"
        assert created["order_index"] == 99
        assert "id" in created and isinstance(created["id"], str)
        mid = created["id"]

        # GET via public list — verify persistence
        r2 = api_client.get(f"{base_url}/api/merchants", timeout=15)
        assert r2.status_code == 200
        assert any(m["id"] == mid for m in r2.json())

        # UPDATE
        upd = {**payload, "name": f"TEST_merchant_{suffix}_upd", "description": "new desc", "category": "smith", "order_index": 1}
        r3 = admin_client.put(f"{base_url}/api/admin/merchants/{mid}", json=upd, timeout=15)
        assert r3.status_code == 200
        updated = r3.json()
        assert updated["name"] == upd["name"]
        assert updated["description"] == "new desc"
        assert updated["category"] == "smith"

        # DELETE
        r4 = admin_client.delete(f"{base_url}/api/admin/merchants/{mid}", timeout=15)
        assert r4.status_code == 200
        assert r4.json() == {"ok": True}

        # DELETE again -> 404
        r5 = admin_client.delete(f"{base_url}/api/admin/merchants/{mid}", timeout=15)
        assert r5.status_code == 404

        # Confirm GONE in public list
        r6 = api_client.get(f"{base_url}/api/merchants", timeout=15)
        assert all(m["id"] != mid for m in r6.json())

    def test_merchant_update_404(self, base_url, admin_client):
        r = admin_client.put(
            f"{base_url}/api/admin/merchants/does-not-exist",
            json={"name": "TEST_x", "category": "gear"},
            timeout=15,
        )
        assert r.status_code == 404


# ---- Guild CRUD ----
class TestGuildCRUD:
    def test_guild_full_lifecycle(self, base_url, admin_client, api_client):
        suffix = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_guild_{suffix}",
            "region": "Espoo",
            "url": "https://example.com/g",
            "category": "other",
            "order_index": 50,
        }
        r = admin_client.post(f"{base_url}/api/admin/guilds", json=payload, timeout=15)
        assert r.status_code == 201, r.text
        gid = r.json()["id"]

        upd = {**payload, "region": "Helsinki", "category": "svtl_member"}
        r2 = admin_client.put(f"{base_url}/api/admin/guilds/{gid}", json=upd, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["region"] == "Helsinki"
        assert r2.json()["category"] == "svtl_member"

        r3 = admin_client.delete(f"{base_url}/api/admin/guilds/{gid}", timeout=15)
        assert r3.status_code == 200

        r4 = admin_client.delete(f"{base_url}/api/admin/guilds/{gid}", timeout=15)
        assert r4.status_code == 404


# ---- PUT /api/admin/events/{id} (NEW full edit) ----
class TestAdminEventEdit:
    def test_full_event_edit_persists(self, base_url, admin_client, api_client):
        # Create an event via public POST first
        suffix = uuid.uuid4().hex[:8]
        ev_payload = {
            "title_fi": f"TEST_iter7_event_{suffix}",
            "description_fi": "kuvaus",
            "category": "meetup",
            "location": "Helsinki",
            "start_date": "2099-06-01",
            "end_date": "2099-06-02",
            "organizer": "TEST org",
            "organizer_email": "test@example.com",
            "link": "https://example.com",
            "image_url": "",
        }
        r = api_client.post(f"{base_url}/api/events", json=ev_payload, timeout=15)
        assert r.status_code == 201, r.text
        eid = r.json()["id"]

        # Approve so it becomes public
        r2 = admin_client.patch(f"{base_url}/api/admin/events/{eid}", json={"status": "approved"}, timeout=15)
        assert r2.status_code == 200

        # PUT full edit
        edit_payload = {
            "title_fi": f"TEST_iter7_event_{suffix}_edited",
            "title_en": "EN title",
            "title_sv": None,  # should normalise to ""
            "description_fi": "uusi kuvaus",
            "description_en": "",
            "description_sv": None,
            "category": "festival",
            "location": "Tampere",
            "start_date": "2099-07-01",
            "end_date": "2099-07-03",
            "organizer": "Edited org",
            "organizer_email": "edit@example.com",
            "link": "",
            "image_url": "",
            "audience": "all",
            "fight_style": "",
        }
        r3 = admin_client.put(f"{base_url}/api/admin/events/{eid}", json=edit_payload, timeout=15)
        assert r3.status_code == 200, r3.text
        upd = r3.json()
        assert upd["title_fi"] == edit_payload["title_fi"]
        assert upd["title_en"] == "EN title"
        assert upd["title_sv"] == ""  # normalised null->''
        assert upd["category"] == "festival"
        assert upd["location"] == "Tampere"
        assert upd["start_date"] == "2099-07-01"
        assert upd["end_date"] == "2099-07-03"
        assert upd["organizer"] == "Edited org"
        # status preserved
        assert upd["status"] == "approved"

        # Verify persistence via admin GET
        r4 = admin_client.get(f"{base_url}/api/admin/events/{eid}", timeout=15)
        assert r4.status_code == 200
        fetched = r4.json()
        assert fetched["title_fi"] == edit_payload["title_fi"]
        assert fetched["location"] == "Tampere"

        # Cleanup
        admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=15)

    def test_put_event_404(self, base_url, admin_client):
        r = admin_client.put(
            f"{base_url}/api/admin/events/does-not-exist",
            json={
                "title_fi": "x",
                "description_fi": "x",
                "category": "other",
                "location": "x",
                "start_date": "2099-01-01",
                "organizer": "x",
            },
            timeout=15,
        )
        assert r.status_code == 404

    def test_patch_status_still_works(self, base_url, admin_client, api_client):
        """Regression: existing PATCH must still work alongside new PUT."""
        suffix = uuid.uuid4().hex[:8]
        r = api_client.post(
            f"{base_url}/api/events",
            json={
                "title_fi": f"TEST_iter7_patch_{suffix}",
                "description_fi": "x",
                "category": "other",
                "location": "x",
                "start_date": "2099-08-01",
                "organizer": "x",
            },
            timeout=15,
        )
        assert r.status_code == 201
        eid = r.json()["id"]
        r2 = admin_client.patch(f"{base_url}/api/admin/events/{eid}", json={"status": "rejected"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["status"] == "rejected"
        admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=15)
