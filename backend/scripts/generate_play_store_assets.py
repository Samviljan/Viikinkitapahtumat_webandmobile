"""
Generate Google Play Store feature graphic AND launcher icon for Viikinkitapahtumat.

Spec:
- Feature graphic: 1024 × 500 px PNG (no alpha)
- App icon: 512 × 512 px PNG (no alpha) — used by Play Store listing

Outputs:
- /app/mobile/.store-assets/feature-graphic.png
- /app/mobile/.store-assets/icon-512.png

Run:
    cd /app/backend && python -m scripts.generate_play_store_assets
"""
import asyncio
import base64
import os
import sys
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

OUT_DIR = Path("/app/mobile/.store-assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Nano Banana doesn't reliably hit exact 1024x500, so we generate a wide 16:9
# composition and crop letterbox-style afterwards via Pillow.
PROMPT = (
    "Wide cinematic banner illustration for the Google Play Store, 16:9 aspect, "
    "for a Nordic viking-events mobile app called 'Viikinkitapahtumat'. "
    "On the LEFT third: a bold gold rune symbol ᚠ (Fehu) inside a hand-carved "
    "circular wooden plaque, slightly weathered, glowing softly with ember light. "
    "MIDDLE: deep charred-wood background with faint Nordic knotwork patterns "
    "etched into a forge-hammered iron texture. RIGHT third: silhouettes of two "
    "viking reenactors in profile (one holding round shield + sword, one holding "
    "long spear), backlit by warm amber bonfire glow with embers drifting upward "
    "like glowing dust. "
    "Subtle Northern-lights aurora behind them, very faint, "
    "muted teal-violet edges fading to black. "
    "Color palette: near-black charred wood (#0E0B09) dominating, ember orange "
    "(#C8492C) glow on right, antique gold (#C9A14A) for the rune and accents, "
    "bone-white mist (#F5EFE3) for atmospheric haze. "
    "Hand-forged almanac aesthetic, looks like a painted woodcut illustration, "
    "moody and atmospheric, very dark overall, NO TEXT, NO LOGOS, NO WORDS, "
    "no UI elements, just the imagery. Wide horizontal format, edges fading "
    "smoothly to black so a title can be overlaid later if needed."
)

ICON_PROMPT = (
    "Square app launcher icon for a Nordic viking-events mobile app, 1024x1024, "
    "centered composition. A bold metallic GOLD rune symbol ᚠ (Fehu, the Old "
    "Norse rune) embossed/forged into a hand-hammered dark iron disc. The disc "
    "has subtle Norse knotwork engravings around the edges and a faint warm "
    "ember glow radiating from behind, as if backlit by a forge fire. "
    "Background: solid charred-wood near-black (#0E0B09) with very subtle "
    "wood grain texture, NOT a transparent background. "
    "Rune color: antique forge gold (#C9A14A) with metallic highlights. "
    "Glow color: warm ember orange (#C8492C) low-intensity halo around the disc. "
    "Visual style: looks like a hand-forged medieval sigil / signet, premium "
    "almanac aesthetic. NO TEXT outside the rune itself, NO LOGOS, NO WORDS, "
    "NO BORDERS, just the centered iron disc with the gold rune. Should look "
    "professional and recognizable at small sizes (48px launcher icon)."
)


async def generate_image(prompt: str, session_tag: str) -> bytes:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("EMERGENT_LLM_KEY missing", file=sys.stderr)
        sys.exit(1)

    chat = (
        LlmChat(api_key=api_key, session_id=session_tag, system_message="image-only")
        .with_model("gemini", "gemini-3.1-flash-image-preview")
        .with_params(modalities=["image", "text"])
    )

    print(f"Requesting Nano Banana image ({session_tag})…")
    _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not images:
        print("No image returned", file=sys.stderr)
        sys.exit(2)
    return base64.b64decode(images[0]["data"])


def crop_to_play_store(raw: bytes) -> Image.Image:
    """
    Resize to width=1024 keeping aspect, then center-crop vertically to 500.
    If the source is shorter than required after width-fit, we pad with black.
    Output is RGB (no alpha — Play Store rejects PNGs with alpha channel).
    """
    img = Image.open(BytesIO(raw)).convert("RGB")
    w, h = img.size
    target_w, target_h = 1024, 500

    # Resize so width = 1024
    new_h = round(h * (target_w / w))
    img = img.resize((target_w, new_h), Image.LANCZOS)

    if new_h >= target_h:
        # Center-crop vertically
        top = (new_h - target_h) // 2
        img = img.crop((0, top, target_w, top + target_h))
    else:
        # Pad black bars top + bottom (rare with 16:9 source)
        canvas = Image.new("RGB", (target_w, target_h), (14, 11, 9))  # bg color
        canvas.paste(img, (0, (target_h - new_h) // 2))
        img = canvas

    return img


def crop_to_square_icon(raw: bytes, size: int = 512) -> Image.Image:
    """Center-crop to a square then resize to size×size, RGB (no alpha)."""
    img = Image.open(BytesIO(raw)).convert("RGB")
    w, h = img.size
    s = min(w, h)
    left = (w - s) // 2
    top = (h - s) // 2
    img = img.crop((left, top, left + s, top + s))
    return img.resize((size, size), Image.LANCZOS)


async def main() -> int:
    # Feature graphic
    print("\n=== 1/2 Feature graphic 1024×500 ===")
    raw = await generate_image(PROMPT, "play-feature-graphic")
    final = crop_to_play_store(raw)
    out = OUT_DIR / "feature-graphic.png"
    final.save(out, format="PNG", optimize=True)
    print(f"Saved {out}  ({out.stat().st_size:,} bytes, {final.size})")

    # App icon 512×512 (Play Store store-listing requirement)
    print("\n=== 2/2 App icon 512×512 ===")
    raw_icon = await generate_image(ICON_PROMPT, "play-app-icon")
    icon = crop_to_square_icon(raw_icon, 512)
    out_icon = OUT_DIR / "icon-512.png"
    icon.save(out_icon, format="PNG", optimize=True)
    print(f"Saved {out_icon}  ({out_icon.stat().st_size:,} bytes, {icon.size})")

    # Also generate 1024×1024 for app launcher (Expo's icon.png) — optional
    icon_1024 = crop_to_square_icon(raw_icon, 1024)
    out_icon_1024 = OUT_DIR / "icon-1024.png"
    icon_1024.save(out_icon_1024, format="PNG", optimize=True)
    print(f"Saved {out_icon_1024}  ({out_icon_1024.stat().st_size:,} bytes, {icon_1024.size})")

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
