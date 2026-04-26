"""
Sync events from production (viikinkitapahtumat.fi) into the preview/test
database. Preserves original IDs so deep-links stay stable.

Behaviour
---------
- Fetches GET https://viikinkitapahtumat.fi/api/events?include_past=true
  (returns only approved events).
- Backs up the current preview events collection to
  `/app/backend/scripts/_preview_events_backup_<ISO>.json`.
- Replaces the preview `events` collection with production events.
- Rewrites relative image URLs (`/api/uploads/...`) to absolute prod URLs
  so the user-uploaded GridFS images still resolve in mobile + web
  without copying the binary blobs cross-DB.

Idempotent: re-running just refreshes preview to the latest prod state.

Run:
    cd /app/backend && python -m scripts.sync_prod_events
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

PROD_BASE = "https://viikinkitapahtumat.fi"
PROD_HOST_FOR_UPLOADS = "https://viikinkitapahtumat.fi"


def absolutise_image(url: str | None) -> str:
    """Rewrite `/api/...` paths to absolute prod URLs so they keep working."""
    if not url:
        return ""
    url = url.strip()
    if url.startswith(("http://", "https://", "data:")):
        return url
    if url.startswith("/api/"):
        return f"{PROD_HOST_FOR_UPLOADS}{url}"
    return url


async def main() -> int:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print(f"Fetching events from {PROD_BASE}/api/events …")
    async with httpx.AsyncClient(timeout=30.0) as cli:
        r = await cli.get(f"{PROD_BASE}/api/events", params={"include_past": "true"})
        r.raise_for_status()
        prod_events = r.json()
    print(f"  → {len(prod_events)} events fetched")

    # 1. Backup current preview events
    current = await db.events.find({}, {"_id": 0}).to_list(None)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = ROOT / "scripts" / f"_preview_events_backup_{ts}.json"
    backup_path.write_text(json.dumps(current, ensure_ascii=False, indent=2, default=str))
    print(f"  backed up {len(current)} preview events → {backup_path}")

    # 2. Normalise prod events: rewrite relative URLs, ensure status=approved
    normalised: list[dict] = []
    for ev in prod_events:
        # Drop any incoming _id / Mongo internals — should already be absent
        ev.pop("_id", None)
        ev["image_url"] = absolutise_image(ev.get("image_url"))
        if ev.get("gallery"):
            ev["gallery"] = [absolutise_image(u) for u in ev["gallery"] if u]
        # Prod /api/events only returns approved; reaffirm
        ev.setdefault("status", "approved")
        normalised.append(ev)

    # 3. Replace preview events
    deleted = await db.events.delete_many({})
    inserted = 0
    if normalised:
        result = await db.events.insert_many(normalised)
        inserted = len(result.inserted_ids)
    print(f"  preview events: deleted {deleted.deleted_count}, inserted {inserted}")

    # 4. Quick summary
    by_status: dict[str, int] = {}
    by_country: dict[str, int] = {}
    has_image = 0
    async for e in db.events.find({}, {"_id": 0, "status": 1, "country": 1, "image_url": 1}):
        by_status[e.get("status", "?")] = by_status.get(e.get("status", "?"), 0) + 1
        c = e.get("country", "?")
        by_country[c] = by_country.get(c, 0) + 1
        if (e.get("image_url") or "").strip():
            has_image += 1
    total = await db.events.count_documents({})
    print("\nFinal preview state:")
    print(f"  total events  : {total}")
    print(f"  by status     : {by_status}")
    print(f"  by country    : {by_country}")
    print(f"  has image_url : {has_image}/{total}")

    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
