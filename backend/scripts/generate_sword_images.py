"""Generate 2 fresh viking sword fighting images for the Swordfighting page.

Saves to /app/frontend/public/sword-images/ as proper PNGs.
"""
import asyncio
import base64
import io
import os
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from PIL import Image

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

OUT_DIR = Path("/app/frontend/public/sword-images")
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_ID = "gemini-3.1-flash-image-preview"

STYLE = (
    "Cinematic dark fantasy historical photograph. Hand-forged aesthetic. "
    "Deep charcoal black background, ember-red glow, bone/parchment highlights, "
    "muted gold and pine-green accents. Volumetric mist, soft firelight. "
    "Wide cinematic 16:9 framing. No text, no logos, no captions, no watermarks, "
    "no modern objects, no tourists. Photorealistic, painterly, hand-crafted."
)

IMAGES = [
    (
        "miekkailu-hero",
        "Two viking warriors in full leather and chainmail kit clashing with steel "
        "swords and round wooden shields, dynamic combat motion, sparks flying from "
        "blades meeting, wooden training hall lit by burning torches and a central "
        "fire, breath visible in cold air, intense focus on the fighters' faces. "
        "Authentic 9th-century viking equipment.",
    ),
    (
        "miekkailu-reenact",
        "A small viking-age warband on the march through a frosted nordic forest at "
        "dawn: warriors in wool tunics, leather armour, kite shields slung on their "
        "backs, axes and spears in hand, banners with norse runes, breath misting in "
        "the cold air, soft amber sunrise filtering through bare trees, snow on the "
        "ground. Authentic 9th-10th century reenactment.",
    ),
]


async def gen_one(slug: str, prompt: str):
    out_path = OUT_DIR / f"{slug}.png"
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = (
        LlmChat(
            api_key=api_key,
            session_id=f"sword-img-{slug}",
            system_message="You are an expert visual director generating cinematic historical imagery.",
        )
        .with_model("gemini", MODEL_ID)
        .with_params(modalities=["image", "text"])
    )
    full_prompt = f"{STYLE}\n\nScene: {prompt}"
    msg = UserMessage(text=full_prompt)
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"[FAIL] {slug}: no image. Text: {text[:120]}")
        return
    img_bytes = base64.b64decode(images[0]["data"])
    # Re-encode to proper PNG
    img = Image.open(io.BytesIO(img_bytes))
    img.save(out_path, format="PNG", optimize=True)
    print(f"[ok] {slug}.png ({out_path.stat().st_size // 1024} KB)")


async def main():
    for slug, prompt in IMAGES:
        try:
            await gen_one(slug, prompt)
        except Exception as e:
            print(f"[error] {slug}: {e}")


if __name__ == "__main__":
    asyncio.run(main())
