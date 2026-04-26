"""Iteration 12 — Image upload feature tests.

Covers:
- POST /api/uploads/events: valid PNG -> 201, file on disk, reachable via ingress
- POST /api/uploads/events: text file -> 415
- POST /api/uploads/events: no file -> 422
- POST /api/uploads/events: >7MB image -> 413
- GET /api/admin/uploads/events: 401 unauth, 200 + sorted DESC mtime when admin
- PUT /api/admin/events/{id}: accepts relative '/api/uploads/...' image_url and persists
"""
import os
import re
import uuid
import zlib
import struct
import time
from pathlib import Path

import pytest
import requests

UPLOAD_DIR = Path("/app/backend/uploads/events")
HEX32_PNG_RE = re.compile(r"^/api/uploads/events/[0-9a-f]{32}\.png$")


def _make_png_bytes(width: int = 1, height: int = 1) -> bytes:
    """Build a minimal valid PNG (1x1 by default) inline using zlib + struct."""
    def chunk(typ: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    raw = b""
    for _ in range(height):
        raw += b"\x00" + (b"\xff\x00\x00" * width)  # filter byte + RGB
    idat = zlib.compress(raw, 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def _make_large_png(approx_size: int = 7 * 1024 * 1024 + 4096) -> bytes:
    """Generate a valid PNG larger than approx_size bytes (for 413 test)."""
    # 2400x2400 random-ish RGB compresses poorly when filled with noise.
    import os as _os
    width = height = 1800
    raw = bytearray()
    for _ in range(height):
        raw.append(0)
        raw.extend(_os.urandom(width * 3))
    return _build_png_from_raw(width, height, bytes(raw))


def _build_png_from_raw(width: int, height: int, raw: bytes) -> bytes:
    def chunk(typ: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(raw, 1)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture
def cleanup_files():
    """Track + delete uploaded files after each test."""
    created: list[str] = []
    yield created
    for fname in created:
        try:
            (UPLOAD_DIR / fname).unlink(missing_ok=True)
        except Exception:  # noqa: BLE001
            pass


# --- POST /api/uploads/events ------------------------------------------------

class TestUploadValidPng:
    def test_valid_png_returns_201_and_persists(self, base_url, cleanup_files):
        png = _make_png_bytes()
        assert len(png) < 200 * 1024  # <200KB
        r = requests.post(
            f"{base_url}/api/uploads/events",
            files={"file": ("hammer.png", png, "image/png")},
            timeout=30,
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert "url" in body and "name" in body
        assert HEX32_PNG_RE.match(body["url"]), f"unexpected url: {body['url']}"
        assert body["name"] == "hammer.png"

        fname = body["url"].rsplit("/", 1)[-1]
        cleanup_files.append(fname)

        # Iter 13: file is now in GridFS, NOT on disk.
        on_disk = UPLOAD_DIR / fname
        assert not on_disk.exists(), f"file should NOT be on disk: {on_disk}"

        # Reachable via ingress (REACT_APP_BACKEND_URL + url)
        get_r = requests.get(f"{base_url}{body['url']}", timeout=30)
        assert get_r.status_code == 200
        assert get_r.content == png
        assert "image/png" in (get_r.headers.get("content-type") or "")


class TestUploadInvalidType:
    def test_text_file_returns_415(self, base_url):
        r = requests.post(
            f"{base_url}/api/uploads/events",
            files={"file": ("note.txt", b"hello world", "text/plain")},
            timeout=30,
        )
        assert r.status_code == 415, r.text


class TestUploadNoFile:
    def test_missing_file_returns_422(self, base_url):
        r = requests.post(f"{base_url}/api/uploads/events", timeout=30)
        assert r.status_code == 422, r.text


class TestUploadTooLarge:
    def test_oversize_file_returns_413(self, base_url):
        big = _make_large_png()
        # ensure we actually exceed 6MB cap
        assert len(big) > 6 * 1024 * 1024
        r = requests.post(
            f"{base_url}/api/uploads/events",
            files={"file": ("big.png", big, "image/png")},
            timeout=60,
        )
        assert r.status_code == 413, f"expected 413, got {r.status_code} ({len(big)} bytes)"


# --- GET /api/admin/uploads/events ------------------------------------------

class TestUploadLibrary:
    def test_unauthenticated_returns_401(self, base_url):
        r = requests.get(f"{base_url}/api/admin/uploads/events", timeout=30)
        assert r.status_code == 401, r.text

    def test_admin_lists_uploads_sorted_desc(self, base_url, admin_client, cleanup_files):
        # Upload two files, ensure ordering by mtime DESC.
        png1 = _make_png_bytes(1, 1)
        r1 = requests.post(
            f"{base_url}/api/uploads/events",
            files={"file": ("first.png", png1, "image/png")},
            timeout=30,
        )
        assert r1.status_code == 201
        first_name = r1.json()["url"].rsplit("/", 1)[-1]
        cleanup_files.append(first_name)

        time.sleep(1.2)  # ensure mtime differs

        png2 = _make_png_bytes(2, 2)
        r2 = requests.post(
            f"{base_url}/api/uploads/events",
            files={"file": ("second.png", png2, "image/png")},
            timeout=30,
        )
        assert r2.status_code == 201
        second_name = r2.json()["url"].rsplit("/", 1)[-1]
        cleanup_files.append(second_name)

        # Admin list — names are original filenames; identify rows by URL filename.
        r = admin_client.get(f"{base_url}/api/admin/uploads/events", timeout=30)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        urls = [it["url"] for it in items]
        first_url = f"/api/uploads/events/{first_name}"
        second_url = f"/api/uploads/events/{second_name}"
        assert first_url in urls and second_url in urls

        # Validate shape on at least one entry
        sample = next(it for it in items if it["url"] == second_url)
        assert sample["name"] == "second.png"
        assert isinstance(sample["size"], int) and sample["size"] > 0
        assert isinstance(sample["mtime"], (int, float))

        # Sorted DESC by uploadDate — second should appear before first
        idx_second = urls.index(second_url)
        idx_first = urls.index(first_url)
        assert idx_second < idx_first, "library should sort by mtime DESC"


# --- PUT /api/admin/events/{id} accepts relative image_url -------------------

class TestAdminEditAcceptsRelativeImage:
    def test_admin_edit_persists_relative_image_url(self, base_url, admin_client, cleanup_files):
        # 1. Upload an image
        png = _make_png_bytes()
        up = requests.post(
            f"{base_url}/api/uploads/events",
            files={"file": ("rel.png", png, "image/png")},
            timeout=30,
        )
        assert up.status_code == 201
        url = up.json()["url"]
        cleanup_files.append(url.rsplit("/", 1)[-1])

        # 2. Create a new event (public submit)
        title = f"TEST_iter12_image_{uuid.uuid4().hex[:8]}"
        ev_payload = {
            "title_fi": title,
            "description_fi": "Testaamme suhteellista kuvaurlia.",
            "category": "other",
            "country": "FI",
            "location": "Testilä",
            "start_date": "2027-06-01",
            "organizer": "TestOrg",
            "organizer_email": "t@example.com",
        }
        cr = requests.post(f"{base_url}/api/events", json=ev_payload, timeout=30)
        assert cr.status_code == 201, cr.text
        eid = cr.json()["id"]

        try:
            # 3. PUT admin edit with relative image_url
            edit_payload = {
                **ev_payload,
                "image_url": url,  # relative '/api/uploads/events/<hex>.png'
                "gallery": [],
                "link": "",
                "audience": "",
                "fight_style": "",
                "title_en": "",
                "title_sv": "",
                "description_en": "",
                "description_sv": "",
                "end_date": None,
            }
            put_r = admin_client.put(
                f"{base_url}/api/admin/events/{eid}", json=edit_payload, timeout=30
            )
            assert put_r.status_code == 200, put_r.text
            assert put_r.json()["image_url"] == url

            # 4. GET admin verifies persistence
            get_r = admin_client.get(f"{base_url}/api/admin/events/{eid}", timeout=30)
            assert get_r.status_code == 200
            assert get_r.json()["image_url"] == url
        finally:
            admin_client.delete(f"{base_url}/api/admin/events/{eid}", timeout=30)
