"""Generate viking-themed event images using Gemini Nano Banana.

Saves PNG files to /app/frontend/public/event-images/ and updates the
matching events in MongoDB to use these new image URLs.

Idempotent: skips a slug if its file already exists on disk
(unless --force is given).
"""

import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

OUT_DIR = Path("/app/frontend/public/event-images")
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_ID = "gemini-3.1-flash-image-preview"

STYLE = (
    "Cinematic dark fantasy historical photograph. Hand-forged aesthetic. "
    "Deep charcoal black background, ember-red glow, bone/parchment highlights, "
    "muted gold and pine-green accents. Volumetric mist, soft firelight. "
    "Wide cinematic 16:9 framing. No text, no logos, no captions, no watermarks, "
    "no modern objects, no tourists. Photorealistic, painterly, hand-crafted."
)

EVENTS = [
    (
        "bonk-pohjalla",
        "Two viking-age fighters in chainmail and helmets clashing with steel swords and round wooden shields, "
        "indoor training hall illuminated by warm firelight, motion blur on weapons, eastern-european viking "
        "fighting style, sweat and breath visible in cold air.",
    ),
    (
        "sleipnir",
        "A viking war-camp at dusk: wool tents in a forest clearing, central bonfire with sparks rising, "
        "warriors sharpening axes and resting around the fire, banners with norse runes hanging between trees, "
        "deep nordic forest behind them.",
    ),
    (
        "vahankyron-viikinkipaivat",
        "A reconstructed viking village by a calm river in early summer, a longship moored at a wooden pier, "
        "children watching a small battle reenactment in the foreground, market stalls with handmade crafts, "
        "warm low sunlight, families in period clothing.",
    ),
    (
        "hameen-keskiaikafestivaali",
        "A bustling early medieval market square: timber stalls, banners, a juggler in motley, a blacksmith "
        "hammering at an anvil with sparks, a crowd in linen and wool clothing, late afternoon golden sunlight, "
        "stone castle visible in the distance.",
    ),
    (
        "keskiajan-turku",
        "A medieval Finnish cathedral and stone-paved old town square at dusk, torches lit on the walls, "
        "merchants closing market stalls, monks in dark robes walking past, deep blue sky with golden lamps, "
        "wide cinematic shot.",
    ),
    (
        "rautakauden-birckala",
        "An iron-age finnic settlement: low sod-roofed log houses, smoke rising from a smithy, women weaving "
        "wool by a loom outside, a ritual rune-stone in the background, autumn birch forest, soft amber light.",
    ),
    (
        "rosalan-viikinkipaivat",
        "A viking village on a rocky archipelago island: a small longship pulled up on the granite shore, "
        "wooden palisade and turf-roofed houses, men throwing axes at a target, sea mist rolling in, "
        "dramatic sky with clouds catching warm light.",
    ),
    (
        "saltvik-viking-market",
        "An open-air viking market on the Åland islands: long rows of trading tents along a meadow, "
        "merchants displaying handcrafted bronze jewellery, leather goods and bone combs, a viking warrior "
        "demonstrating swordcraft to onlookers, bright nordic summer light.",
    ),
    (
        "tarinoiden-tori",
        "A medieval-themed family festival square in summer twilight: lantern-lit market stalls, children "
        "in linen tunics gathered around a storyteller in a cloak, jugglers and musicians with hurdy-gurdies, "
        "warm intimate firelight.",
    ),
    (
        "ulvilan-hansamarkkinat",
        "A hanseatic-era medieval marketplace: wooden merchant stalls with cloth, fur, and barrels of grain, "
        "a horse-drawn cart unloading goods, traders in period dress haggling, timber-framed buildings in the "
        "background, soft overcast nordic light.",
    ),
    (
        "wiipurintien-markkinat",
        "A medieval Finnish market on a forest road: knights on horseback preparing for a small joust in the "
        "background, market stalls in the foreground, banners flying, a juggler entertaining a crowd, dramatic "
        "afternoon sunlight breaking through pines.",
    ),
    (
        "helsingin-keskiaikapaiva",
        "A medieval Finnish stone church surrounded by a small festival: merchants in linen robes, a wooden "
        "stage with a lute player, torches burning along the church walls, soft late-summer twilight, "
        "intimate community feeling.",
    ),
]

# Mapping of slug -> matching seed_slug (organizer::start_date::title_fi)
SLUG_TO_SEED = {
    "bonk-pohjalla": "Oulun Miekkailuseura::2026-04-03::Bonk Pohjalla VII",
    "sleipnir": "Ulvilan Kaarti::2026-05-21::Sleipnir fighting camp, Ulvila",
    "vahankyron-viikinkipaivat": "Vaasan kaupunki / Vähäkyrö-Seura ry::2026-06-05::Vähänkyrön Viikinkipäivä",
    "hameen-keskiaikafestivaali": "Hämeen keskiaikayhdistys::2026-06-12::Hämeen Keskiaikafestivaali",
    "keskiajan-turku": "Keskiajan Turku::2026-06-25::Keskiajan Turku",
    "rautakauden-birckala": "Rautakauden Birckala::2026-07-04::Rautakauden Birckala",
    "rosalan-viikinkipaivat": "Rosala Viking Centre::2026-07-18::Rosalan viikinkipäivät",
    "saltvik-viking-market": "Fornföreningen Fibula::2026-07-23::Saltvik Viking Market",
    "tarinoiden-tori": "Wine & Cafe Jokiranta::2026-07-25::Tarinoiden Tori",
    "ulvilan-hansamarkkinat": "Lions Club Ulvila ry::2026-08-01::Ulvilan Keskiaikaiset Hansamarkkinat",
    "wiipurintien-markkinat": "Wiipurintien markkinat::2026-08-08::Wiipurintien markkinat",
    "helsingin-keskiaikapaiva": (
        "Vantaa-Seura, Tikkurilan Seurakunta, Vanda svenska församling::2026-08-22::Helsingin Keskiaikapäivä"
    ),
}


async def gen_one(slug: str, prompt: str, force: bool):
    out_path = OUT_DIR / f"{slug}.png"
    if out_path.exists() and not force:
        print(f"[skip] {slug}.png already exists")
        return out_path
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = (
        LlmChat(
            api_key=api_key,
            session_id=f"viking-img-{slug}",
            system_message="You are an expert visual director generating cinematic historical imagery.",
        )
        .with_model("gemini", MODEL_ID)
        .with_params(modalities=["image", "text"])
    )
    full_prompt = f"{STYLE}\n\nScene: {prompt}"
    msg = UserMessage(text=full_prompt)
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"[FAIL] {slug}: no image returned. Text: {text[:120]}")
        return None
    img = images[0]
    image_bytes = base64.b64decode(img["data"])
    out_path.write_bytes(image_bytes)
    print(f"[ok] {slug}.png ({len(image_bytes) // 1024} KB)")
    return out_path


async def main():
    force = "--force" in sys.argv
    # Generate sequentially to avoid rate limits
    for slug, prompt in EVENTS:
        try:
            await gen_one(slug, prompt, force)
        except Exception as e:
            print(f"[error] {slug}: {e}")

    # Update DB with new image URLs
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    updated = 0
    for slug, _prompt in EVENTS:
        seed_slug = SLUG_TO_SEED.get(slug)
        if not seed_slug:
            continue
        new_url = f"/event-images/{slug}.png"
        res = await db.events.update_one(
            {"seed_slug": seed_slug},
            {"$set": {"image_url": new_url}},
        )
        updated += res.modified_count
    print(f"Updated {updated} event docs with new image URLs.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
