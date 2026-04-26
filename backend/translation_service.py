"""Lightweight Claude Haiku translator for event content fields.

Used as a FastAPI BackgroundTask: when an event is created or edited, any
empty (title|description) field is filled by translating the most-populated
sibling. Cheap, async-only, no message persistence.
"""

import logging
import os
import uuid
from typing import Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

LANG_NAME = {"fi": "Finnish", "en": "English", "sv": "Swedish"}
MODEL = "claude-haiku-4-5-20251001"
PROVIDER = "anthropic"


async def translate(text: str, source: str, target: str) -> Optional[str]:
    """Translate `text` from source language to target language.

    Returns the translated text, or None on failure. Source/target are short
    language codes (fi, en, sv). Designed for short-to-medium event copy
    (titles, descriptions up to ~3000 chars).
    """
    text = (text or "").strip()
    if not text:
        return None
    if source == target:
        return text
    src = LANG_NAME.get(source, source)
    tgt = LANG_NAME.get(target, target)
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.warning("translate: EMERGENT_LLM_KEY missing")
        return None
    system = (
        f"You are a professional translator for a Finnish viking-age living-history events "
        f"website. Translate the user's text from {src} to {tgt}. Preserve tone, line breaks, "
        f"capitalisation of proper nouns and event names. Do NOT add commentary, quotes, or "
        f"markdown — output the translated text only."
    )
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"translate-{uuid.uuid4()}",
            system_message=system,
        ).with_model(PROVIDER, MODEL)
        msg = UserMessage(text=text)
        out = await chat.send_message(msg)
        return (out or "").strip()
    except Exception as e:  # noqa: BLE001
        logger.exception("translate(%s->%s) failed: %s", source, target, e)
        return None


def _pick_source(values: dict[str, str]) -> Optional[str]:
    """Return language code with the longest non-empty value, prefer fi > en > sv."""
    candidates = [(lang, (values.get(lang) or "").strip()) for lang in ("fi", "en", "sv")]
    candidates = [(lang, v) for lang, v in candidates if v]
    if not candidates:
        return None
    candidates.sort(key=lambda x: -len(x[1]))
    return candidates[0][0]


async def fill_missing_translations(db, event_id: str) -> dict:
    """For the given event, fill any empty `title_*` / `description_*` field by
    translating from whichever language is populated. Persists only fields
    that were empty AND successfully translated.
    """
    ev = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not ev:
        return {"ok": False, "reason": "not_found"}

    updates: dict = {}
    for base in ("title", "description"):
        values = {lang: ev.get(f"{base}_{lang}", "") for lang in ("fi", "en", "sv")}
        src = _pick_source(values)
        if not src:
            continue
        for tgt in ("fi", "en", "sv"):
            if tgt == src:
                continue
            if (values.get(tgt) or "").strip():
                continue  # already has content, don't overwrite
            translated = await translate(values[src], src, tgt)
            if translated:
                updates[f"{base}_{tgt}"] = translated

    if updates:
        await db.events.update_one({"id": event_id}, {"$set": updates})
        logger.info("auto-translated event %s fields=%s", event_id, list(updates.keys()))
    return {"ok": True, "updated": list(updates.keys())}
