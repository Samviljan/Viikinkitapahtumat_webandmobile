"""
One-shot rollback: undo the AI-image migration from iter 16 for any event
that DOES NOT have a user-uploaded image. This restores the field to ""
so that the website + mobile both fall back to a placeholder.

Rule: keep `image_url` only when it points to a user-uploaded asset
(GridFS at `/api/uploads/events/...` or any external HTTPS URL the user
explicitly entered). Strip any `/api/events-images/...` URL set by
the iter16 migration script.

Idempotent — safe to re-run.

Run:
    cd /app/backend && python -m scripts.clear_ai_event_images
"""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


async def main() -> int:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    cleared = 0
    kept = 0
    cursor = db.events.find(
        {}, {"_id": 0, "id": 1, "title_fi": 1, "image_url": 1}
    )
    async for ev in cursor:
        url = (ev.get("image_url") or "").strip()
        if url.startswith("/api/events-images/"):
            await db.events.update_one(
                {"id": ev["id"]},
                {"$set": {"image_url": ""}},
            )
            cleared += 1
            print(f"  ✓ cleared  {ev['id'][:8]}  {ev.get('title_fi', '')[:40]}")
        else:
            kept += 1

    print(f"\nDone: {cleared} cleared, {kept} kept (user-uploaded or external).")
    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
