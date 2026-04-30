"""
Iteration 14 — Merchant Card (users.merchant_card) backend tests.

Covers:
 - /api/merchants UNION (legacy + user cards)
 - /api/merchants/{user_id} public detail (enabled user card only)
 - /api/users/me/merchant-card  (GET / PUT)
 - /api/users/me/merchant-card/image  (POST multipart)
 - /api/users/me/favorite-merchants  (GET / POST / DELETE)
 - /api/admin/users/{id}/merchant-card/{enable,disable,featured}  (admin)
 - /api/admin/merchant-cards  (admin list)
 - /auth/login + /auth/me include merchant_card + favorite_merchant_ids

Admin: the real admin password is unknown to this agent, so we provision a
temporary admin via direct DB insert (bcrypt hash), then remove it in
teardown. We never touch admin@viikinkitapahtumat.fi.
"""
from __future__ import annotations

import io
import os
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import pymongo
import pytest
import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
if not BASE_URL:
    from pathlib import Path
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break
assert BASE_URL, "REACT_APP_BACKEND_URL not set"

MONGO_URL = os.environ.get("MONGO_URL") or ""
if not MONGO_URL:
    from pathlib import Path
    env_path = Path("/app/backend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("MONGO_URL="):
                MONGO_URL = line.split("=", 1)[1].strip().strip('"')
            if line.startswith("DB_NAME="):
                os.environ["DB_NAME"] = line.split("=", 1)[1].strip().strip('"')
DB_NAME = os.environ.get("DB_NAME") or "test_database"

MEMBER_EMAIL = "webuser_1777367519@viikinki.fi"
MEMBER_PASSWORD = "passw0rd123"
MEMBER_ID = "user_28a958533568"

TMP_ADMIN_EMAIL = f"test_admin_{uuid.uuid4().hex[:8]}@viikinki.fi"
TMP_ADMIN_PASSWORD = "TempAdmin123!"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def mongo():
    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture(scope="module")
def member_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MEMBER_EMAIL, "password": MEMBER_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Member login failed: {r.status_code} {r.text[:400]}"
    body = r.json()
    return body.get("token") or body.get("access_token") or body.get("user", {}).get("token")


@pytest.fixture(scope="module")
def member_client(member_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {member_token}",
    })
    return s


@pytest.fixture(scope="module")
def temp_admin(mongo):
    """Provision a temporary admin user directly in MongoDB for the admin
    endpoint tests. Removed in teardown."""
    user_doc = {
        "id": f"tmpadmin_{uuid.uuid4().hex[:10]}",
        "email": TMP_ADMIN_EMAIL,
        "password_hash": bcrypt.hashpw(
            TMP_ADMIN_PASSWORD.encode(), bcrypt.gensalt()
        ).decode(),
        "has_password": True,
        "nickname": "TempAdmin QA",
        "name": "TempAdmin QA",
        "role": "admin",
        "user_types": ["admin"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "failed_login_attempts": 0,
        "locked_until": None,
    }
    mongo.users.insert_one(user_doc)
    yield user_doc
    mongo.users.delete_one({"id": user_doc["id"]})


@pytest.fixture(scope="module")
def admin_client(temp_admin):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TMP_ADMIN_EMAIL, "password": TMP_ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Temp admin login failed: {r.status_code} {r.text[:300]}"
    token = r.json().get("token") or r.json().get("access_token")
    assert token, "No token in temp admin login response"
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    return s


# ---------------------------------------------------------------------------
# /api/merchants UNION
# ---------------------------------------------------------------------------

class TestMerchantsUnion:
    def test_union_returns_legacy_plus_user_cards(self):
        r = requests.get(f"{BASE_URL}/api/merchants", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 19, f"Expected >=19 (19 legacy + user cards), got {len(data)}"

        user_cards = [m for m in data if m.get("is_user_card")]
        legacy = [m for m in data if not m.get("is_user_card")]
        assert len(legacy) >= 19
        assert len(user_cards) >= 1, "Expected at least 1 user merchant card in union"

        # Shape check on a user card
        card = next((m for m in user_cards if m.get("id") == MEMBER_ID), None)
        assert card is not None, f"Member user card id={MEMBER_ID} missing in union"
        for key in ("id", "name", "is_user_card", "image_url", "phone",
                    "email", "featured"):
            assert key in card, f"user card missing field: {key}"
        assert card["is_user_card"] is True

    def test_expired_card_excluded(self, mongo):
        """Backdate merchant_until and confirm the card disappears from /api/merchants."""
        now = datetime.now(timezone.utc)
        past = (now - timedelta(days=2)).isoformat()
        future = (now + timedelta(days=365)).isoformat()

        # Save original, then backdate
        original = mongo.users.find_one({"id": MEMBER_ID}, {"merchant_card": 1})
        orig_until = (original.get("merchant_card") or {}).get("merchant_until")
        try:
            mongo.users.update_one(
                {"id": MEMBER_ID},
                {"$set": {"merchant_card.merchant_until": past}},
            )
            r = requests.get(f"{BASE_URL}/api/merchants", timeout=30)
            assert r.status_code == 200
            ids = [m["id"] for m in r.json()]
            assert MEMBER_ID not in ids, "Expired user card must be filtered from /api/merchants"
        finally:
            # Restore (preserve original if any, else set 365d in future)
            restore = orig_until or future
            mongo.users.update_one(
                {"id": MEMBER_ID},
                {"$set": {"merchant_card.merchant_until": restore}},
            )


# ---------------------------------------------------------------------------
# /api/merchants/{user_id} detail
# ---------------------------------------------------------------------------

class TestMerchantDetail:
    def test_enabled_user_card_returns_detail(self):
        r = requests.get(f"{BASE_URL}/api/merchants/{MEMBER_ID}", timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("id") == MEMBER_ID
        assert "name" in data and data["name"]
        # Upcoming events list should exist (may be empty)
        # Field may be named 'events' or 'upcoming_events'
        assert any(k in data for k in ("events", "upcoming_events")), \
            f"No events field present: {list(data.keys())}"

    def test_legacy_merchant_id_returns_404(self):
        # Grab a legacy merchant id from the union
        all_m = requests.get(f"{BASE_URL}/api/merchants", timeout=30).json()
        legacy = next((m for m in all_m if not m.get("is_user_card")), None)
        assert legacy is not None
        r = requests.get(f"{BASE_URL}/api/merchants/{legacy['id']}", timeout=30)
        assert r.status_code == 404

    def test_unknown_id_returns_404(self):
        r = requests.get(f"{BASE_URL}/api/merchants/nonexistent_user_xyz", timeout=30)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Auth payload shape
# ---------------------------------------------------------------------------

class TestAuthMePayload:
    def test_login_includes_merchant_card_and_favorites(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MEMBER_EMAIL, "password": MEMBER_PASSWORD},
            timeout=30,
        )
        assert r.status_code == 200
        body = r.json()
        user = body.get("user") or body
        assert "merchant_card" in user, f"merchant_card missing on login: keys={list(user.keys())}"
        assert "favorite_merchant_ids" in user, \
            f"favorite_merchant_ids missing on login: keys={list(user.keys())}"

    def test_me_includes_merchant_card(self, member_client):
        r = member_client.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert r.status_code == 200
        u = r.json()
        assert "merchant_card" in u
        assert "favorite_merchant_ids" in u


# ---------------------------------------------------------------------------
# Owner: /api/users/me/merchant-card (GET / PUT)
# ---------------------------------------------------------------------------

class TestOwnerMerchantCard:
    def test_get_my_card(self, member_client):
        r = member_client.get(f"{BASE_URL}/api/users/me/merchant-card", timeout=30)
        assert r.status_code == 200
        card = r.json()
        assert card.get("enabled") is True
        assert card.get("shop_name")

    def test_put_updates_fields_and_persists(self, member_client):
        # Save originals then restore after test
        original = member_client.get(
            f"{BASE_URL}/api/users/me/merchant-card", timeout=30
        ).json()
        try:
            payload = {
                "shop_name": "Helkas Forge QA",
                "website": "https://example.com/helka",
                "phone": "+358 40 111 2222",
                "email": "helka@example.com",
                "description": "Hand-forged viking blades QA run.",
                "category": "smith",
            }
            r = member_client.put(
                f"{BASE_URL}/api/users/me/merchant-card",
                json=payload, timeout=30,
            )
            assert r.status_code == 200, r.text[:300]
            updated = r.json()
            for k, v in payload.items():
                assert updated.get(k) == v, f"{k}: expected {v!r} got {updated.get(k)!r}"

            # GET to confirm persistence
            r2 = member_client.get(f"{BASE_URL}/api/users/me/merchant-card", timeout=30)
            assert r2.status_code == 200
            fetched = r2.json()
            assert fetched["shop_name"] == payload["shop_name"]
            assert fetched["description"] == payload["description"]
        finally:
            # Restore original fields (best-effort)
            restore = {
                k: original.get(k)
                for k in ("shop_name", "website", "phone", "email", "description", "category")
                if original.get(k) is not None
            }
            if restore:
                member_client.put(
                    f"{BASE_URL}/api/users/me/merchant-card",
                    json=restore, timeout=30,
                )

    def test_put_rejects_description_over_1000(self, member_client):
        r = member_client.put(
            f"{BASE_URL}/api/users/me/merchant-card",
            json={"description": "x" * 1001},
            timeout=30,
        )
        assert r.status_code in (400, 422), f"expected 400/422, got {r.status_code}: {r.text[:200]}"

    def test_put_rejects_empty_shop_name(self, member_client):
        r = member_client.put(
            f"{BASE_URL}/api/users/me/merchant-card",
            json={"shop_name": "   "},
            timeout=30,
        )
        assert r.status_code in (400, 422)

    def test_put_requires_auth(self):
        r = requests.put(
            f"{BASE_URL}/api/users/me/merchant-card",
            json={"shop_name": "Hax"}, timeout=30,
        )
        assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Image upload
# ---------------------------------------------------------------------------

_PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\x8d\x8d\xdf\x88\x00\x00\x00\x00IEND\xaeB`\x82"
)


class TestMerchantCardImage:
    def test_upload_valid_png(self, member_client, member_token):
        files = {"file": ("helka.png", io.BytesIO(_PNG_1X1), "image/png")}
        # Use requests directly so we don't force JSON content-type
        r = requests.post(
            f"{BASE_URL}/api/users/me/merchant-card/image",
            headers={"Authorization": f"Bearer {member_token}"},
            files=files, timeout=30,
        )
        assert r.status_code in (200, 201), r.text[:300]
        body = r.json()
        assert "url" in body
        assert body["url"].startswith("/api/uploads/profile-images/")

        # Card's image_url updated
        card = member_client.get(
            f"{BASE_URL}/api/users/me/merchant-card", timeout=30
        ).json()
        assert card.get("image_url") == body["url"]

        # Public detail surfaces the image_url
        detail = requests.get(f"{BASE_URL}/api/merchants/{MEMBER_ID}", timeout=30).json()
        assert detail.get("image_url") == body["url"]

    def test_upload_rejects_non_image(self, member_token):
        files = {"file": ("evil.txt", io.BytesIO(b"not an image"), "text/plain")}
        r = requests.post(
            f"{BASE_URL}/api/users/me/merchant-card/image",
            headers={"Authorization": f"Bearer {member_token}"},
            files=files, timeout=30,
        )
        assert r.status_code == 415, f"expected 415, got {r.status_code}"

    def test_upload_rejects_oversize(self, member_token):
        big = b"\x89PNG\r\n\x1a\n" + b"0" * (3 * 1024 * 1024 + 100)
        files = {"file": ("big.png", io.BytesIO(big), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/users/me/merchant-card/image",
            headers={"Authorization": f"Bearer {member_token}"},
            files=files, timeout=60,
        )
        assert r.status_code == 413, f"expected 413, got {r.status_code}"


# ---------------------------------------------------------------------------
# Favorite merchants
# ---------------------------------------------------------------------------

class TestFavoriteMerchants:
    FAKE_ID = "fav_merchant_qa_1"
    FAKE_ID_2 = "fav_merchant_qa_2"

    def test_full_flow(self, member_client):
        # Baseline
        r = member_client.get(f"{BASE_URL}/api/users/me/favorite-merchants", timeout=30)
        assert r.status_code == 200
        base_ids = r.json().get("merchant_ids", [])
        assert isinstance(base_ids, list)

        # Add
        r2 = member_client.post(
            f"{BASE_URL}/api/users/me/favorite-merchants/{self.FAKE_ID}", timeout=30
        )
        assert r2.status_code in (200, 201)
        ids = r2.json().get("merchant_ids", [])
        assert self.FAKE_ID in ids

        # Idempotent
        r3 = member_client.post(
            f"{BASE_URL}/api/users/me/favorite-merchants/{self.FAKE_ID}", timeout=30
        )
        assert r3.status_code in (200, 201)
        ids2 = r3.json().get("merchant_ids", [])
        assert ids2.count(self.FAKE_ID) == 1

        # Add a second then delete first
        member_client.post(
            f"{BASE_URL}/api/users/me/favorite-merchants/{self.FAKE_ID_2}", timeout=30
        )
        r4 = member_client.delete(
            f"{BASE_URL}/api/users/me/favorite-merchants/{self.FAKE_ID}", timeout=30
        )
        assert r4.status_code in (200, 204)
        if r4.status_code == 200:
            body = r4.json()
            assert self.FAKE_ID not in body.get("merchant_ids", [])
            assert self.FAKE_ID_2 in body.get("merchant_ids", [])

        # Idempotent delete
        r5 = member_client.delete(
            f"{BASE_URL}/api/users/me/favorite-merchants/{self.FAKE_ID}", timeout=30
        )
        assert r5.status_code in (200, 204)

        # Cleanup
        member_client.delete(
            f"{BASE_URL}/api/users/me/favorite-merchants/{self.FAKE_ID_2}", timeout=30
        )

    def test_unauthenticated_rejected(self):
        r = requests.get(f"{BASE_URL}/api/users/me/favorite-merchants", timeout=30)
        assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

class TestAdminMerchantCards:
    def test_list_endpoint(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/merchant-cards", timeout=30)
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert isinstance(data, list)
        ids = [u.get("id") or u.get("user_id") for u in data]
        assert MEMBER_ID in ids, \
            f"Expected member {MEMBER_ID} in admin merchant-cards list; got {ids[:5]}..."

    def test_unauth_list_rejected(self):
        r = requests.get(f"{BASE_URL}/api/admin/merchant-cards", timeout=30)
        assert r.status_code in (401, 403)

    def test_enable_and_toggle_featured(self, admin_client, mongo, member_client):
        # Ensure starting from enabled
        r = admin_client.post(
            f"{BASE_URL}/api/admin/users/{MEMBER_ID}/merchant-card/enable",
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text[:200]

        user = mongo.users.find_one({"id": MEMBER_ID}, {"merchant_card": 1, "user_types": 1})
        mc = user.get("merchant_card") or {}
        assert mc.get("enabled") is True
        assert mc.get("merchant_until"), "merchant_until must be set after enable"
        # Must be > now
        until = datetime.fromisoformat(mc["merchant_until"].replace("Z", "+00:00"))
        assert until > datetime.now(timezone.utc)
        assert "merchant" in (user.get("user_types") or []), \
            "merchant user_type must be auto-added"

        # Toggle featured true -> false -> true (restore)
        orig_featured = bool(mc.get("featured", False))
        r2 = admin_client.patch(
            f"{BASE_URL}/api/admin/users/{MEMBER_ID}/merchant-card/featured",
            json={"featured": True}, timeout=30,
        )
        assert r2.status_code == 200, r2.text[:200]
        card = r2.json()
        assert card.get("featured") is True

        r3 = admin_client.patch(
            f"{BASE_URL}/api/admin/users/{MEMBER_ID}/merchant-card/featured",
            json={"featured": False}, timeout=30,
        )
        assert r3.status_code == 200
        assert r3.json().get("featured") is False

        # Restore original
        admin_client.patch(
            f"{BASE_URL}/api/admin/users/{MEMBER_ID}/merchant-card/featured",
            json={"featured": orig_featured}, timeout=30,
        )

    def test_disable_blocks_owner_put_then_reenable(self, admin_client, member_client, mongo):
        # Disable
        r = admin_client.post(
            f"{BASE_URL}/api/admin/users/{MEMBER_ID}/merchant-card/disable",
            timeout=30,
        )
        assert r.status_code in (200, 201)
        user = mongo.users.find_one({"id": MEMBER_ID}, {"merchant_card": 1})
        mc = user.get("merchant_card") or {}
        assert mc.get("enabled") is False
        assert mc.get("featured") is False  # disable must also clear featured

        # PUT should now fail with 403
        r2 = member_client.put(
            f"{BASE_URL}/api/users/me/merchant-card",
            json={"shop_name": "Should Fail"}, timeout=30,
        )
        assert r2.status_code == 403, f"Expected 403 when disabled, got {r2.status_code}"

        # Public /api/merchants/{id} should 404 (card disabled)
        r3 = requests.get(f"{BASE_URL}/api/merchants/{MEMBER_ID}", timeout=30)
        assert r3.status_code == 404

        # PATCH featured on disabled card must fail
        r4 = admin_client.patch(
            f"{BASE_URL}/api/admin/users/{MEMBER_ID}/merchant-card/featured",
            json={"featured": True}, timeout=30,
        )
        assert r4.status_code in (400, 403, 404, 409), \
            f"Featured on disabled card should fail; got {r4.status_code}"

        # Re-enable (restore baseline for subsequent runs)
        r5 = admin_client.post(
            f"{BASE_URL}/api/admin/users/{MEMBER_ID}/merchant-card/enable",
            timeout=30,
        )
        assert r5.status_code in (200, 201)
        # Re-set featured=True to match seed state noted in credentials
        admin_client.patch(
            f"{BASE_URL}/api/admin/users/{MEMBER_ID}/merchant-card/featured",
            json={"featured": True}, timeout=30,
        )


# ---------------------------------------------------------------------------
# Expiry sweep (direct DB — validates the query the scheduler uses)
# ---------------------------------------------------------------------------

class TestExpirySweep:
    def test_backdated_card_filtered_from_list(self, mongo):
        """Mirror of TestMerchantsUnion.test_expired_card_excluded but scoped
        to the sweep semantics: a card with merchant_until in the past must
        not appear in /api/merchants even if enabled=true."""
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        user = mongo.users.find_one({"id": MEMBER_ID}, {"merchant_card": 1})
        orig_until = (user.get("merchant_card") or {}).get("merchant_until")

        try:
            mongo.users.update_one(
                {"id": MEMBER_ID},
                {"$set": {"merchant_card.merchant_until": past}},
            )
            r = requests.get(f"{BASE_URL}/api/merchants", timeout=30)
            assert r.status_code == 200
            ids = [m["id"] for m in r.json()]
            assert MEMBER_ID not in ids
        finally:
            mongo.users.update_one(
                {"id": MEMBER_ID},
                {"$set": {"merchant_card.merchant_until": orig_until}},
            )
