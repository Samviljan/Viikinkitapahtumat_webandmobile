"""One-shot helper to generate default event images.

Runs the same plan as `POST /api/admin/default-event-images/generate?count=2`
but bypasses admin auth (used by the agent during fork bootstrap).
"""
from __future__ import annotations

import asyncio
import logging
import sys

# Make sure /app/backend is importable when invoked from /app/backend
sys.path.insert(0, "/app/backend")

from server import (  # noqa: E402
    DEFAULT_IMAGES_PER_CATEGORY,
    EVENT_CATEGORIES,
    _run_default_image_batch,
    db,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")


async def main() -> None:
    plan: list[dict] = []
    for cat in EVENT_CATEGORIES:
        existing = await db.default_event_images.count_documents({"category": cat})
        needed = max(0, DEFAULT_IMAGES_PER_CATEGORY - existing)
        plan.append({"category": cat, "existing": existing, "to_generate": needed})
    print("Plan:", plan, flush=True)
    await _run_default_image_batch(plan)
    print("Done.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
