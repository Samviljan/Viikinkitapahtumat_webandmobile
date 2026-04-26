"""Generate `et` and `pl` UI dictionaries for /app/frontend/src/lib/i18n.js by
asking Claude Sonnet to translate the entire `fi` block as one JSON payload.

Usage:  python /app/backend/scripts/generate_i18n.py
Output: prints two ready-to-paste JS object literals to stdout.
"""

import asyncio
import json
import os
import re
import sys
import uuid

from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
sys.path.insert(0, "/app/backend")

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

I18N_FILE = "/app/frontend/src/lib/i18n.js"


def _extract_fi_block() -> str:
    """Return the JS object literal text for the `fi:` entry."""
    text = open(I18N_FILE).read()
    # Match starting at "fi: {" and capture until matching closing brace
    start = text.index("  fi: {")
    # Walk braces
    i = text.index("{", start)
    depth = 1
    j = i + 1
    while depth > 0 and j < len(text):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
        j += 1
    return text[i:j]


def _flatten(obj: dict, prefix: str = "") -> dict:
    out: dict = {}
    for k, v in obj.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(_flatten(v, key))
        elif isinstance(v, list):
            for idx, item in enumerate(v):
                out[f"{key}.{idx}"] = item
        else:
            out[key] = v
    return out


def _unflatten(flat: dict, schema: dict) -> dict:
    """Reassemble nested object using the original schema as shape reference."""
    def _walk(node, path):
        if isinstance(node, dict):
            return {k: _walk(v, f"{path}.{k}" if path else k) for k, v in node.items()}
        if isinstance(node, list):
            return [_walk(v, f"{path}.{i}") for i, v in enumerate(node)]
        return flat.get(path, node)
    return _walk(schema, "")


def _strict_json(text: str) -> dict:
    # Strip ```json fences if present
    s = text.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return json.loads(s)


# Hand-translate the JS literal as a Python dict by running JSON-ish parser.
# Convert JS to JSON: unquoted keys → quoted, single quotes → double, trailing
# commas removed.
def js_obj_to_python(js: str) -> dict:
    s = js
    # Quote keys: identifier followed by colon
    s = re.sub(r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:", r'\1"\2":', s)
    # Replace JS undefined with JSON null
    s = re.sub(r"\bundefined\b", "null", s)
    # Remove trailing commas before } or ]
    s = re.sub(r",(\s*[}\]])", r"\1", s)
    return json.loads(s)


def python_to_js(obj, indent=4) -> str:
    """Render a Python dict back as a JS object literal with indentation."""
    raw = json.dumps(obj, ensure_ascii=False, indent=indent)
    # Optionally we could un-quote identifier keys, but JS accepts quoted keys.
    return raw


async def translate_batch(items: dict, target_lang_name: str, target_code: str, attempt: int = 0) -> dict:
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(
        api_key=api_key,
        session_id=f"i18n-{target_code}-{uuid.uuid4()}",
        system_message=(
            "You are a professional translator for a Finnish viking-age living-history events "
            f"website. Translate the JSON values from Finnish to {target_lang_name}. "
            "Preserve placeholder tokens like {n}, capitalised proper nouns ('SVTL', 'BONK', "
            "'Viikinkiaika'), and short abbreviations. KEEP THE EXACT SAME KEYS. "
            "Output ONLY a single JSON object with the same keys, values translated. No commentary, no markdown."
        ),
    ).with_model("anthropic", "claude-haiku-4-5-20251001")
    payload = json.dumps(items, ensure_ascii=False, indent=0)
    msg = UserMessage(text=payload)
    try:
        out = await chat.send_message(msg)
        return _strict_json(out)
    except Exception as e:  # noqa: BLE001
        if attempt < 2:
            await asyncio.sleep(2 + attempt)
            return await translate_batch(items, target_lang_name, target_code, attempt + 1)
        print(f"// translate_batch FAILED after {attempt+1} attempts: {e}", file=sys.stderr)
        return {}


async def translate_dict(flat_fi: dict, target_lang_name: str, target_code: str) -> dict:
    BATCH = 40
    keys = list(flat_fi.keys())
    out: dict = {}
    for i in range(0, len(keys), BATCH):
        batch_keys = keys[i:i + BATCH]
        batch = {k: flat_fi[k] for k in batch_keys}
        translated = await translate_batch(batch, target_lang_name, target_code)
        out.update(translated)
        print(f"// {target_code}: batch {i // BATCH + 1}/{(len(keys) + BATCH - 1) // BATCH} done ({len(translated)} keys)", file=sys.stderr)
    return out


async def main():
    fi_block = _extract_fi_block()
    fi_obj = js_obj_to_python(fi_block)
    flat = _flatten(fi_obj)
    print(f"// {len(flat)} keys to translate", file=sys.stderr)

    for lang_code, lang_name in [("et", "Estonian"), ("pl", "Polish")]:
        print(f"// Translating {len(flat)} strings to {lang_name}…", file=sys.stderr)
        translated_flat = await translate_dict(flat, lang_name, lang_code)
        # Some keys may be missing — fall back to FI source for safety
        missing = set(flat) - set(translated_flat)
        if missing:
            print(f"// {lang_code}: {len(missing)} keys missing, falling back to fi", file=sys.stderr)
            for k in missing:
                translated_flat[k] = flat[k]
        rebuilt = _unflatten(translated_flat, fi_obj)
        print(f"\n  // === {lang_code} ===")
        print(f"  {lang_code}: {python_to_js(rebuilt, indent=4)},")


if __name__ == "__main__":
    asyncio.run(main())
