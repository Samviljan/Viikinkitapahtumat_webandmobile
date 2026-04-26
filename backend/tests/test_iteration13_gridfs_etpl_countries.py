"""Iteration 13 — GridFS image storage + et/pl i18n + IS/LV/LT countries.

Covers:
- POST /api/uploads/events: file persisted in GridFS (event_images.files / .chunks),
  NOT on disk; GET returns same bytes + correct content-type.
- GET /api/uploads/events/<unknown>.png returns 404.
- PUT /api/admin/events/{id}: country = IS / LV / LT accepted; ZZ rejected (422).
- /app/frontend/src/lib/i18n.js contains top-level 'et:' and 'pl:' keys with nav.events
  and events.title populated (read-only assertion — never overwrite).
"""
import os
import re
import uuid
import zlib
import struct
import hashlib
from pathlib import Path

import pytest
import requests
from pymongo import MongoClient

UPLOAD_DIR = Path("/app/backend/uploads/events")
HEX32_RE = re.compile(r"^[0-9a-f]{32}\.(png|jpg|jpeg|webp|gif)$")
I18N_PATH = Path("/app/frontend/src/lib/i18n.js")


def _make_png_bytes(width: int = 1, height: int = 1) -> bytes:
    def chunk(typ: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = b""
    for _ in range(height):
        raw += b"\x00" + (b"\xff\x00\x00" * width)
    idat = zlib.compress(raw, 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


# ---------------------------------------------------------------------------
# Direct mongo helper to verify GridFS persistence
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def mongo_db():
    mongo_url = os.environ.get("MONGO_URL") or "mongodb://localhost:27017"
    db_name = os.environ.get("DB_NAME") or "viikinki_db"
    if not db_name:
        # Fallback: read from backend/.env
        env_path = Path("/app/backend/.env")
        for line in env_path.read_text().splitlines():
            if line.startswith("DB_NAME="):
                db_name = line.split("=", 1)[1].strip().strip('"')
                break
    client = MongoClient(mongo_url)
    yield client[db_name]
    client.close()


@pytest.fixture
def gridfs_cleanup(mongo_db):
    """Delete uploaded GridFS docs after each test."""
    filenames: list[str] = []
    yield filenames
    for fn in filenames:
        try:
            doc = mongo_db["event_images.files"].find_one({"filename": fn})
            if doc:
                fid = doc["_id"]
                mongo_db["event_images.files"].delete_one({"_id": fid})
                mongo_db["event_images.chunks"].delete_many({"files_id": fid})
        except Exception:
            pass


# ---------------------------------------------------------------------------
# 1) GridFS-backed upload — bytes, mime, no-disk, mongo doc
# ---------------------------------------------------------------------------
class TestGridFSUpload:
    def test_upload_persists_in_gridfs_not_disk(self, base_url, mongo_db, gridfs_cleanup):
        png = _make_png_bytes(2, 2)
        digest = hashlib.md5(png).hexdigest()

        r = requests.post(
            f"{base_url}/api/uploads/events",
            files={"file": ("hammer.png", png, "image/png")},
            timeout=30,
        )
        assert r.status_code == 201, r.text
        body = r.json()
        url = body["url"]
        assert url.startswith("/api/uploads/events/")
        fname = url.rsplit("/", 1)[-1]
        assert HEX32_RE.match(fname), f"unexpected filename: {fname}"
        gridfs_cleanup.append(fname)

        # NOT on disk
        on_disk = UPLOAD_DIR / fname
        assert not on_disk.exists(), f"file unexpectedly written to disk: {on_disk}"

        # GET returns same bytes + correct content-type
        get_r = requests.get(f"{base_url}{url}", timeout=30)
        assert get_r.status_code == 200
        assert "image/png" in (get_r.headers.get("content-type") or "")
        assert hashlib.md5(get_r.content).hexdigest() == digest

        # Document in event_images.files with metadata
        files_doc = mongo_db["event_images.files"].find_one({"filename": fname})
        assert files_doc is not None
        meta = files_doc.get("metadata") or {}
        assert meta.get("content_type") == "image/png"
        assert meta.get("original_name") == "hammer.png"
        assert files_doc.get("length") == len(png)

        # Chunks exist
        chunk_count = mongo_db["event_images.chunks"].count_documents(
            {"files_id": files_doc["_id"]}
        )
        assert chunk_count >= 1

    def test_unknown_filename_returns_404(self, base_url):
        r = requests.get(
            f"{base_url}/api/uploads/events/{uuid.uuid4().hex}.png", timeout=30
        )
        assert r.status_code == 404, r.text

    def test_admin_list_includes_uploaded(self, base_url, admin_client, gridfs_cleanup):
        png = _make_png_bytes()
        up = requests.post(
            f"{base_url}/api/uploads/events",
            files={"file": ("from-list.png", png, "image/png")},
            timeout=30,
        )
        assert up.status_code == 201
        url = up.json()["url"]
        gridfs_cleanup.append(url.rsplit("/", 1)[-1])

        r = admin_client.get(f"{base_url}/api/admin/uploads/events", timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        match = next((it for it in items if it["url"] == url), None)
        assert match is not None, f"uploaded {url} not in admin list"
        assert match["name"] == "from-list.png"
        assert isinstance(match["size"], int) and match["size"] == len(png)
        assert isinstance(match["mtime"], (int, float))


# ---------------------------------------------------------------------------
# 2) Country literal extended — IS / LV / LT accepted; ZZ rejected
# ---------------------------------------------------------------------------
class TestCountryExtension:
    def _create_event(self, base_url, country: str = "FI") -> str:
        title = f"TEST_iter13_country_{uuid.uuid4().hex[:8]}"
        payload = {
            "title_fi": title,
            "description_fi": "Testaamme maita.",
            "category": "other",
            "country": country,
            "location": "Testilä",
            "start_date": "2027-07-01",
            "organizer": "TestOrg",
            "organizer_email": "t@example.com",
        }
        r = requests.post(f"{base_url}/api/events", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        return r.json()["id"]

    @pytest.mark.parametrize("cc", ["IS", "LV", "LT"])
    def test_admin_put_accepts_new_country(self, base_url, admin_client, cc):
        eid = self._create_event(base_url)
        try:
            payload = {
                "title_fi": f"TEST_iter13_country_{cc}",
                "description_fi": "X",
                "category": "other",
                "country": cc,
                "location": "X",
                "start_date": "2027-07-01",
                "organizer": "T",
                "organizer_email": "t@example.com",
            }
            r = admin_client.put(
                f"{base_url}/api/admin/events/{eid}", json=payload, timeout=30
            )
            assert r.status_code == 200, r.text
            assert r.json()["country"] == cc

            # Verify persisted
            g = admin_client.get(f"{base_url}/api/admin/events/{eid}", timeout=30)
            assert g.status_code == 200
            assert g.json()["country"] == cc
        finally:
            admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=30)

    def test_admin_put_rejects_invalid_country(self, base_url, admin_client):
        eid = self._create_event(base_url)
        try:
            payload = {
                "title_fi": "T",
                "description_fi": "X",
                "category": "other",
                "country": "ZZ",
                "location": "X",
                "start_date": "2027-07-01",
                "organizer": "T",
                "organizer_email": "t@example.com",
            }
            r = admin_client.put(
                f"{base_url}/api/admin/events/{eid}", json=payload, timeout=30
            )
            assert r.status_code == 422, r.text
        finally:
            admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=30)


# ---------------------------------------------------------------------------
# 3) i18n.js — assert et + pl dicts present (no overwrite!)
# ---------------------------------------------------------------------------
class TestI18nDicts:
    def test_i18n_has_et_and_pl_with_nav_and_events(self):
        text = I18N_PATH.read_text(encoding="utf-8")
        assert re.search(r"^\s*et:\s*\{", text, re.MULTILINE), "missing top-level 'et:'"
        assert re.search(r"^\s*pl:\s*\{", text, re.MULTILINE), "missing top-level 'pl:'"

        # Slice et block (from 'et: {' to end of file or next top-level lang)
        m_et = re.search(r"^\s*et:\s*\{", text, re.MULTILINE)
        assert m_et
        et_block = text[m_et.start():]
        # Find pl start to bound et block
        m_pl_after = re.search(r"^\s*pl:\s*\{", et_block, re.MULTILINE)
        et_only = et_block[: m_pl_after.start()] if m_pl_after else et_block
        assert '"events"' in et_only and '"Üritused"' in et_only, (
            "et.nav.events should be 'Üritused'"
        )

        # pl block: from pl onwards
        m_pl = re.search(r"^\s*pl:\s*\{", text, re.MULTILINE)
        pl_block = text[m_pl.start():]
        assert '"events"' in pl_block and '"Wydarzenia"' in pl_block, (
            "pl.nav.events should be 'Wydarzenia'"
        )

    def test_i18n_top_level_langs_unchanged(self):
        text = I18N_PATH.read_text(encoding="utf-8")
        for lang in ("fi", "en", "sv", "et", "pl"):
            assert re.search(rf"^\s*{lang}:\s*\{{", text, re.MULTILINE), (
                f"missing language block: {lang}"
            )
