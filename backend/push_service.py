"""Push notification helpers (Expo Push Service).

Sends notifications via the public Expo Push API
(https://exp.host/--/api/v2/push/send), which:
  * accepts up to 100 messages per request
  * has a soft rate limit of 600 notifications/sec per project
  * never fails synchronously for "DeviceNotRegistered" — that comes back
    in the ticket payload and we surface it so the caller can mark tokens
    inactive.

Public functions:
  * `send_push_batch(messages)` — low-level batched send
  * `send_to_users(db, user_ids, title, body, data)` — high-level helper
    that resolves users → tokens → sends and prunes invalid tokens.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Iterable

import httpx

logger = logging.getLogger(__name__)

EXPO_API = "https://exp.host/--/api/v2/push/send"
MAX_BATCH = 100


def _is_valid_token(token: str) -> bool:
    """Expo tokens look like `ExponentPushToken[xxxx]` or `ExpoPushToken[xxxx]`."""
    return isinstance(token, str) and (
        token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")
    )


async def send_push_batch(messages: list[dict]) -> list[dict]:
    """Send up to MAX_BATCH messages and return the list of tickets."""
    if not messages:
        return []
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    token = os.environ.get("EXPO_ACCESS_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    out: list[dict] = []
    for i in range(0, len(messages), MAX_BATCH):
        chunk = messages[i : i + MAX_BATCH]
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(EXPO_API, json=chunk, headers=headers)
            if resp.status_code != 200:
                logger.warning("Expo push HTTP %s: %s", resp.status_code, resp.text[:300])
                continue
            data = resp.json().get("data", [])
            out.extend(data if isinstance(data, list) else [])
        except Exception as exc:  # noqa: BLE001
            logger.warning("Expo push failed: %s", exc)
        await asyncio.sleep(0.05)  # tiny gap between batches
    return out


async def send_to_users(
    db,
    user_ids: Iterable[str],
    *,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> dict:
    """Resolve user_ids → push tokens, send, and prune invalid tokens.

    Returns a small summary {sent, errors, recipients}.
    """
    user_ids_list = list(user_ids)
    if not user_ids_list:
        return {"sent": 0, "errors": 0, "recipients": 0}

    cursor = db.users.find(
        {"id": {"$in": user_ids_list}, "expo_push_tokens": {"$exists": True, "$ne": []}},
        {"_id": 0, "id": 1, "expo_push_tokens": 1},
    )
    users = await cursor.to_list(10000)
    # Flat map (token → user_id) so we can prune invalid tokens later.
    pairs: list[tuple[str, str]] = []
    for u in users:
        for tk in u.get("expo_push_tokens") or []:
            if _is_valid_token(tk):
                pairs.append((tk, u["id"]))

    if not pairs:
        return {"sent": 0, "errors": 0, "recipients": 0}

    messages = [
        {
            "to": tk,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "data": data or {},
        }
        for (tk, _uid) in pairs
    ]
    tickets = await send_push_batch(messages)

    # Match tickets back to pairs by index (Expo preserves order).
    sent = 0
    errors = 0
    invalid_tokens: list[str] = []
    for idx, ticket in enumerate(tickets):
        if ticket.get("status") == "ok":
            sent += 1
        else:
            errors += 1
            details = ticket.get("details") or {}
            err = details.get("error") or ticket.get("message") or ""
            if "DeviceNotRegistered" in str(err):
                if idx < len(pairs):
                    invalid_tokens.append(pairs[idx][0])

    if invalid_tokens:
        await db.users.update_many(
            {"expo_push_tokens": {"$in": invalid_tokens}},
            {"$pull": {"expo_push_tokens": {"$in": invalid_tokens}}},
        )
        logger.info("Pruned %d invalid push tokens", len(invalid_tokens))

    return {
        "sent": sent,
        "errors": errors,
        "recipients": len(pairs),
        "ts": datetime.now(timezone.utc).isoformat(),
    }
