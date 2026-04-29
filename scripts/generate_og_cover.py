"""
One-shot script to generate the Open Graph cover for viikinkitapahtumat.fi.

Output: /app/frontend/public/og-cover.jpg (1200×630, JPEG, ≤300 KB)

Run:  cd /app/backend && python3 ../scripts/generate_og_cover.py
"""
import asyncio
import base64
import io
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image

load_dotenv("/app/backend/.env")

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

OUT = Path("/app/frontend/public/og-cover.jpg")
TARGET_W, TARGET_H = 1200, 630

PROMPT = """Open Graph social-share cover image for the website
viikinkitapahtumat.fi (Finnish Viking & reenactment events portal).

Composition: cinematic, atmospheric, dark moody Nordic landscape at dusk.
A long Viking longship silhouette glides across a misty fjord, warm
torch-light glowing from its deck. Pine forests on both sides, snow-dusted
mountains in the far distance, low golden sunset breaking through grey
clouds. A lone reenactor in chainmail and fur cloak stands on a rocky
shore in profile, holding an axe and a round shield with the rune ᚠ
(Fehu) painted in deep red. Subtle particles of snow / glowing embers
float across the scene.

Atmosphere: ancient, epic, historical, solemn. Reminiscent of
high-quality documentary photography or a tasteful living-history
museum poster. Strong cinematic depth-of-field. Color palette: deep
charcoal, warm gold, ember orange, bone white, blood red.

Composition rules:
- LANDSCAPE 16:9-ish aspect ratio (wider than tall, ~1200x630)
- Negative space on the right third for site title overlay (do not draw
  any text, logos, or letters yourself — leave that area visually quiet
  but compositionally complete)
- Centered focal point should sit slightly left of center
- No watermarks, no captions, no text whatsoever
- Photoreal style, NOT cartoonish or anime
"""


async def main() -> int:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("EMERGENT_LLM_KEY missing in /app/backend/.env", file=sys.stderr)
        return 1

    chat = LlmChat(
        api_key=api_key,
        session_id="og-cover-2026-04-29",
        system_message=(
            "You are an art-direction assistant generating cinematic "
            "photorealistic landscape images for historical-events websites."
        ),
    )
    chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(
        modalities=["image", "text"]
    )

    print("Generating OG cover via Nano Banana (Gemini 3 Pro Image)…")
    text, images = await chat.send_message_multimodal_response(UserMessage(text=PROMPT))
    print(f"Model text reply (preview): {(text or '')[:120]}")

    if not images:
        print("No image returned by model.", file=sys.stderr)
        return 2

    img_bytes = base64.b64decode(images[0]["data"])
    print(f"Got {len(img_bytes)} bytes, mime={images[0].get('mime_type')}")

    # Re-encode to JPEG 1200×630 (cover-fit) with quality 86 to stay under
    # ~300 KB. Open Graph specifies optimal 1200×630 for FB / LinkedIn /
    # WhatsApp previews.
    src = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    src_ratio = src.width / src.height
    tgt_ratio = TARGET_W / TARGET_H
    if src_ratio > tgt_ratio:
        # Source is wider — crop sides
        new_w = int(src.height * tgt_ratio)
        x = (src.width - new_w) // 2
        cropped = src.crop((x, 0, x + new_w, src.height))
    else:
        # Source is taller — crop top/bottom
        new_h = int(src.width / tgt_ratio)
        y = (src.height - new_h) // 2
        cropped = src.crop((0, y, src.width, y + new_h))
    final = cropped.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    final.save(OUT, format="JPEG", quality=86, optimize=True, progressive=True)
    print(f"Saved {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
