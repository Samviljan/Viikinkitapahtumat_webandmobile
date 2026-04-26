"""
One-shot migration: replace broken external viikinkitapahtumat.fi/pics/*.jpg
URLs on seeded events with the local AI-generated PNG images served via
/api/events-images/*. Idempotent — safe to run multiple times.

Run:
    cd /app/backend && python -m scripts.migrate_event_images
"""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

# Map original external image basename → local PNG filename in
# /app/frontend/public/event-images/. Keys are matched case-insensitively
# against the existing event.image_url. Unmapped entries are left untouched.
URL_MAP = {
    "bonk.jpg": "bonk-pohjalla.png",
    "sleipnir.jpg": "sleipnir.png",
    "vahakyro.jpg": "vahankyron-viikinkipaivat.png",
    "keskiaikafestivaali.jpg": "hameen-keskiaikafestivaali.png",
    "keskiajan_turku.jpg": "keskiajan-turku.png",
    "rautakaudenpirkkala.jpg": "rautakauden-birckala.png",
    "saltvik.jpg": "saltvik-viking-market.png",
    "tarinoidentori.jpg": "tarinoiden-tori.png",
    "hansamarkkinat.jpg": "ulvilan-hansamarkkinat.png",
    "viipurintienmarkkinat.jpg": "wiipurintien-markkinat.png",
    "helsinkikeskiaikapaiva.jpg": "helsingin-keskiaikapaiva.png",
}

# Title-based fallback for events that had image_url="" (e.g. Rosalan)
TITLE_MAP = {
    "rosalan viikinkipäivät": "rosalan-viikinkipaivat.png",
}

NEW_PREFIX = "/api/events-images/"


async def main() -> int:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    updated = 0
    skipped = 0
    cursor = db.events.find({}, {"_id": 0, "id": 1, "title_fi": 1, "image_url": 1})
    async for ev in cursor:
        cur = (ev.get("image_url") or "").strip()
        title = (ev.get("title_fi") or "").strip().lower()

        new_url: str | None = None

        # 1) URL-based mapping
        for old_base, new_name in URL_MAP.items():
            if cur.lower().endswith(old_base):
                new_url = f"{NEW_PREFIX}{new_name}"
                break

        # 2) Title-based mapping (only if no image yet OR pointing at broken external)
        if new_url is None and (cur == "" or "viikinkitapahtumat.fi/pics/" in cur.lower()):
            for needle, new_name in TITLE_MAP.items():
                if needle in title:
                    new_url = f"{NEW_PREFIX}{new_name}"
                    break

        if new_url and new_url != cur:
            await db.events.update_one(
                {"id": ev["id"]},
                {"$set": {"image_url": new_url}},
            )
            updated += 1
            print(f"  ✓ {ev['id']:8s}  {title[:40]:40s} → {new_url}")
        else:
            skipped += 1

    print(f"\nMigration complete: {updated} updated, {skipped} skipped.")
    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
