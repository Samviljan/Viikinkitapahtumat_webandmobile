"""Idempotent seed for merchants + guilds taxonomy.

Inserts the curated lists previously hardcoded in Shops.jsx and Guilds.jsx.
Re-running is safe: existing rows (matched by name) are updated in place.
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")


GENERAL_SHOPS = [
    ("Rautaportti", "", "https://www.rautaportti.fi/"),
    ("Oulun Miekkailutarvike", "", "https://www.miekkailutarvike.fi/"),
    ("LotgarVikingCrafts", "", "https://www.etsy.com/shop/LotgarVikingCrafts/"),
    ("Perkele Clothing", "", "https://www.facebook.com/perkele.shop"),
    ("Wojmir", "", "https://wojmir.pl/en/shop/"),
    ("Kram Goch", "", "https://www.kramgoch.pl/eng/"),
    ("VikingMarket.eu", "", "https://vikingmarket.eu/"),
    ("Ruslana", "", "https://www.ruslana.com.pl/"),
    ("Ruslav Leatherworks", "", "https://ryslav-leatherwork.com/en/"),
    ("HÅKON, viking helmet", "", "https://wulflund.com/"),
    ("Grimfrost Webshop", "", "https://grimfrost.com/"),
    ("Weapon and Armour by Viktor Berbekucz", "", "https://www.swordsviktor.com/"),
    ("Living History Market", "", "https://living-history-market.com/"),
    ("Battle Merchant", "", "https://battlemerchant.com/"),
    ("Kaksi kanaa ja pässi", "Käsinommeltuja vaatteita", "https://kierratysmuotia.fi/"),
    ("Keskiaikapuoti", "", "https://keskiaikapuoti.fi/"),
    ("Torkel Design", "Laadukkaita metalli- ja puusepäntuotteita", "https://torkel.fi/"),
]

SMITHS = [
    ("Takomo Hukkarauta", "", "https://hukkarauta.fi/"),
    ("Smithefix", "", "https://www.facebook.com/Smithefix"),
]

SVTL_MEMBERS = [
    ("Birckalan Soturit", "Tampere", "https://www.facebook.com/BirckalanKaarti/"),
    ("Björnfell", "Kouvola", "https://www.facebook.com/Bjornfellry"),
    ("Palkkakorpit", "Jyväskylä", "https://www.facebook.com/palkkakorpit"),
    ("Pohjan Kaarti", "Oulu", "https://www.facebook.com/PohjanKaarti/"),
    ("Vanajan Sudet", "Hämeenlinna", "https://www.facebook.com/vanajansudet"),
    ("Wirran Vartijat", "Turku", "https://www.wirranwartijat.fi/"),
]

OTHER_GUILDS = [
    ("Harjun Kaarti", "Jyväskylä", "https://harjunkaarti.wordpress.com/"),
    ("Ulvilan Kaarti", "Ulvila / Pori", "https://ulvilankeskiaikaseura.wordpress.com/about/"),
    ("Vanajan Kaarti", "Hämeenlinna", "https://www.facebook.com/profile.php?id=100064126771790"),
    ("Kalevan Kaarti", "Riihimäki", "https://www.facebook.com/groups/646939508688182/user/61551061170781"),
    ("Louhen Kaarti", "Tampere", "https://louhenkaarti.fi/"),
    ("Finnish Vanguards", "Coalition of Finnish Viking Fighters for Foreign Events", "https://finnishvanguard.com/"),
    ("Freya's Vigil", "Ulvila", "https://www.facebook.com/profile.php?id=61580234994358"),
    ("Harmaasudet", "Helsinki", "https://www.facebook.com/harmaasudet/"),
    ("Faravidin sudet", "—", "https://www.facebook.com/FaravidinSudet"),
    ("Holmgershird", "Ahvenanmaa", "https://www.facebook.com/HolmgersHird/"),
    ("Odin's Guard", "—", "https://www.facebook.com/groups/646939508688182/user/100064633514651/"),
    ("Sotka — Viikinkiajan laiva", "—", "https://www.facebook.com/groups/89621572520/"),
    ("Elävä Keskiaika ry", "—", "https://www.facebook.com/elavakeskiaika"),
    ("Sommelo ry", "—", "https://www.facebook.com/groups/sommelory/"),
    ("Aarniometsän paronikunta", "Suomen Keskiaikaseura ry", "https://www.facebook.com/groups/149121295016//"),
]


async def upsert_many(coll, rows, builder):
    now = datetime.now(timezone.utc).isoformat()
    n = 0
    for idx, row in enumerate(rows):
        doc = builder(row, idx)
        existing = await coll.find_one({"name": doc["name"]})
        if existing:
            doc["updated_at"] = now
            await coll.update_one({"name": doc["name"]}, {"$set": doc})
        else:
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = now
            await coll.insert_one(doc)
        n += 1
    return n


def _merchant(row, idx, category):
    name, desc, url = row
    return {"name": name, "description": desc, "url": url, "category": category, "order_index": idx}


def _guild(row, idx, category):
    name, region, url = row
    return {"name": name, "region": region, "url": url, "category": category, "order_index": idx}


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]
    await db.merchants.create_index("id", unique=True, sparse=True)
    await db.merchants.create_index("name", unique=True)
    await db.guilds.create_index("id", unique=True, sparse=True)
    await db.guilds.create_index("name", unique=True)

    n1 = await upsert_many(db.merchants, GENERAL_SHOPS, lambda r, i: _merchant(r, i, "gear"))
    n2 = await upsert_many(db.merchants, SMITHS, lambda r, i: _merchant(r, i, "smith"))
    n3 = await upsert_many(db.guilds, SVTL_MEMBERS, lambda r, i: _guild(r, i, "svtl_member"))
    n4 = await upsert_many(db.guilds, OTHER_GUILDS, lambda r, i: _guild(r, i, "other"))
    print(f"Merchants seeded: gear={n1}, smith={n2}. Guilds seeded: svtl={n3}, other={n4}.")
    c.close()


if __name__ == "__main__":
    asyncio.run(main())
