"""
Generate a single hero/background PNG for the mobile app, matching the
website's "hand-forged almanac" viking aesthetic (dark + ember + gold + bone).
Saves to /app/mobile/assets/bg-viking.png.

Run:
    cd /app/backend && python -m scripts.generate_mobile_bg
"""
import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

OUT = Path("/app/mobile/assets/bg-viking.png")

PROMPT = (
    "Cinematic atmospheric portrait-orientation background image for a Finnish "
    "viking-age events mobile app. Subtle, dark, almost monochrome. Far in the "
    "distance: a lone hooded viking wanderer carrying a long spear, walking on a "
    "narrow stone path through silver-birch and dark evergreen forest at dusk. "
    "Heavy mist between the trees. Faint runestone with weathered carvings on "
    "the left foreground, slightly out of focus. Embers from an unseen campfire "
    "drifting upward like glowing dust. "
    "Color palette: charred-wood near-black background (#0E0B09), muted gold "
    "highlights (#C9A14A) catching tree edges and the runestone, occasional "
    "ember-red specks (#C8492C), bone-white mist (#F5EFE3). "
    "Hand-forged almanac aesthetic — looks painted/woodcut, faintly grainy, "
    "no text, no UI, no logos, edges fading to deep black so foreground UI "
    "remains readable on top. 9:16 vertical aspect, very dark overall."
)


async def main() -> int:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("EMERGENT_LLM_KEY missing", file=sys.stderr)
        return 1

    chat = (
        LlmChat(api_key=api_key, session_id="mobile-bg", system_message="image-only")
        .with_model("gemini", "gemini-3.1-flash-image-preview")
        .with_params(modalities=["image", "text"])
    )

    print("Requesting Nano Banana background…")
    _text, images = await chat.send_message_multimodal_response(UserMessage(text=PROMPT))
    if not images:
        print("No image returned", file=sys.stderr)
        return 2

    img = images[0]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(base64.b64decode(img["data"]))
    print(f"Saved {OUT}  ({OUT.stat().st_size:,} bytes, mime={img.get('mime_type')})")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
