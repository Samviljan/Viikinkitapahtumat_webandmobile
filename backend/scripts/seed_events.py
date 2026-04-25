"""Seed real 2026 events from viikinkitapahtumat.fi.

Idempotent: identifies events by a stable slug (= organizer+start_date),
upserts them as approved. Run from /app/backend.
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

EVENTS = [
    {
        "title_fi": "Bonk Pohjalla VII",
        "description_fi": "Eastern style viking fighting training weekend and BONK tournament. Harrastajille suunnattu viikonloppu, joka huipentuu BONK-turnaukseen.",
        "description_en": "Eastern style viking fighting training weekend and BONK tournament.",
        "category": "battle",
        "location": "Oulu",
        "start_date": "2026-04-03",
        "end_date": "2026-04-05",
        "organizer": "Oulun Miekkailuseura",
        "link": "https://fb.me/e/472CjHCeZ",
        "image_url": "https://viikinkitapahtumat.fi/pics/bonk.jpg",
        "audience": "Harrastajat",
        "fight_style": "Eastern",
    },
    {
        "title_fi": "Sleipnir fighting camp, Ulvila",
        "description_fi": (
            "Neljä päivää elävöitystä (voi tulla lyhemmäksikin aikaa), käsitöitä, taistelutreenejä ja "
            "illanviettoa nuotiolla. Ulvilan Keskiaikaseura järjestää nyt jo perinteeksi muodostuneen "
            "Sleipnir-leirin. Voittoa tavoittelematon tapahtuma elävöittäjille, jotka elävöittävät "
            "Suomen rautakautta, viikinkiaikaa ja Suomen keskiaikaa."
        ),
        "category": "battle",
        "location": "Ulvila",
        "start_date": "2026-05-21",
        "end_date": "2026-05-24",
        "organizer": "Ulvilan Kaarti",
        "link": "https://www.facebook.com/profile.php?id=61574769457271",
        "image_url": "https://viikinkitapahtumat.fi/pics/sleipnir.jpg",
        "audience": "Harrastajat",
        "fight_style": "Western",
    },
    {
        "title_fi": "Vähänkyrön Viikinkipäivä",
        "description_fi": (
            "Taistelunäytöksiä, työpajoja, toimintapisteitä, elämyksiä ja viikinkimarkkinatunnelmaa! "
            "Järjestetään vuonna 2026 5-vuotisjuhlavuoden kunniaksi kaksipäiväisenä tapahtumana. "
            "Historianelävöittäjäystävät tervetulleita pystyttämään telttansa Kirkkosaaren viikinkileiriin. "
            "Maksuton, päihteetön koko perheen tapahtuma."
        ),
        "category": "festival",
        "location": "Merikaarrontie 5, Vähäkyrö",
        "start_date": "2026-06-05",
        "end_date": "2026-06-07",
        "organizer": "Vaasan kaupunki / Vähäkyrö-Seura ry",
        "link": "https://vaasa.fi/vahassakyrossa-tapahtuu/",
        "image_url": "https://viikinkitapahtumat.fi/pics/vahakyro.jpg",
        "audience": "Yleisö",
        "fight_style": "Western",
    },
    {
        "title_fi": "Hämeen Keskiaikafestivaali",
        "description_fi": (
            "Vuoden 2026 teema on Kylä, kaupunki ja yhteisö. Kolmen päivän ajan Kantolan tapahtumapuisto "
            "täyttyy taistelunäytöksistä, markkinoista, musiikista, käsityöläisistä ja yhdessä tekemisen ilosta. "
            "Ole osa tarinaa!"
        ),
        "category": "festival",
        "location": "Hämeenlinna",
        "start_date": "2026-06-12",
        "end_date": "2026-06-14",
        "organizer": "Hämeen keskiaikayhdistys",
        "link": "https://keskiaikafestivaali.fi/",
        "image_url": "https://viikinkitapahtumat.fi/pics/keskiaikafestivaali.jpg",
        "audience": "Yleisö",
        "fight_style": "Western",
    },
    {
        "title_fi": "Keskiajan Turku",
        "description_fi": (
            "Aikamatka iloiseen, valoisaan ja jännittävään keskiaikaan! Keskiajan Turku on Suomen suurin "
            "keskiaika- ja muinaistapahtuma. Ohjelmaa tuottaa Turun Suurtorin Keskiaika ry, Aboa Vetus Ars Nova, "
            "Turun tuomiokirkko, Turun linna sekä Rohan Tallit."
        ),
        "category": "festival",
        "location": "Turku",
        "start_date": "2026-06-25",
        "end_date": "2026-06-28",
        "organizer": "Keskiajan Turku",
        "link": "https://www.facebook.com/@keskiajanturku",
        "image_url": "https://viikinkitapahtumat.fi/pics/keskiajan_turku.jpg",
        "audience": "Yleisö",
        "fight_style": "",
    },
    {
        "title_fi": "Rautakauden Birckala",
        "description_fi": (
            "Suuren suosion saavuttanut Rautakauden Birckala järjestetään yhdeksättä kertaa Reipin alueella "
            "Pirkkalassa 4.–5.7.2026. Tapahtuma ammentaa aiheensa Pirkkalan omasta esihistoriasta sekä "
            "Tursiannotkon rautakautisesta asuinpaikasta. Ohjelmassa työpajoja, taistelunäytöksiä, muinaisia "
            "kädentaitoja, opastettuja kierroksia ja muinaismusiikkia. Käsityöläisten markkinoilla myydään vain "
            "luonnonmateriaaleista valmistettuja käsin tehtyjä tuotteita."
        ),
        "category": "festival",
        "location": "Reipin Museo, Pirkkala",
        "start_date": "2026-07-04",
        "end_date": "2026-07-05",
        "organizer": "Rautakauden Birckala",
        "link": "https://fb.me/e/bCvCHYJW5",
        "image_url": "https://viikinkitapahtumat.fi/pics/rautakaudenpirkkala.jpg",
        "audience": "Yleisö",
        "fight_style": "Western",
    },
    {
        "title_fi": "Rosalan viikinkipäivät",
        "description_fi": (
            "Meillä vierailee ryhmä viikinkejä, jotka viikonlopun aikana asuvat viikinkikylässä ja esittelevät "
            "vierailijoille viikinkiaikaista elämää, käsitöitä ja aktiviteetteja. Monipuolinen valikoima "
            "viikinkiajan tekniikalla tehtyjä käsitöitä ja tuotteita on myynnissä. Markkinapaikalla myydään myös "
            "muita torituotteita. Matkailijat saavat osallistua aktiviteetteihin – kirveenheitto ja viikinkisoturin "
            "kenttäleivän paisto avotulella ovat perinteisesti olleet hyvin suosittuja koko perheen ajanvietteitä."
        ),
        "category": "festival",
        "location": "Rosala / Hiittinen",
        "start_date": "2026-07-18",
        "end_date": "2026-07-19",
        "organizer": "Rosala Viking Centre",
        "link": "https://rosala.fi/fi/vikingadagar/",
        "image_url": "",
        "audience": "Yleisö",
        "fight_style": "Western",
    },
    {
        "title_fi": "Saltvik Viking Market",
        "title_sv": "Saltvik Viking Market",
        "title_en": "Saltvik Viking Market",
        "description_fi": (
            "Saltvik Viking Market järjestetään perinteisesti heinäkuun viimeisenä viikonloppuna Kvarnbon viikinkikylässä, "
            "Saltvikissa Ahvenanmaalla. Kolmen päivän ajan viikinkejä ympäri maailman kokoontuu esittelemään käsitöitä, "
            "leikkejä, taistelutaitoja ja historiaa. Ohjelmaa koko perheelle, ruokaa ja juomaa viikinkiajan tyyliin."
        ),
        "description_sv": (
            "Saltvik Viking Market anordnas traditionsenligt sista helgen i juli i den fina vikingabyn i Kvarnbo, "
            "Saltvik på Åland. I tre dagar samlas vikingar från alla världens hörn för att förevisa hantverk, lekar, "
            "stridskunskap och historia."
        ),
        "description_en": (
            "Saltvik Viking Market takes place traditionally on the last weekend in July in our beautiful Viking village "
            "in Kvarnbo, Saltvik on Åland. For three days, Vikings from all over the world gather to demonstrate crafts, "
            "games, combat skills and history."
        ),
        "category": "market",
        "location": "Saltvik / Ahvenanmaa",
        "start_date": "2026-07-23",
        "end_date": "2026-07-25",
        "organizer": "Fornföreningen Fibula",
        "link": "https://fb.me/e/6P0tLjHeN",
        "image_url": "https://viikinkitapahtumat.fi/pics/saltvik.jpg",
        "audience": "Yleisö",
        "fight_style": "Western Klandorf",
    },
    {
        "title_fi": "Tarinoiden Tori",
        "description_fi": (
            "Keskiaikateemainen tapahtuma, jossa aktiviteetteja lapsille ja lapsenmielisille sekä myyntikojuja ja ruokaa. "
            "Avoin ja ilmainen yleisötapahtuma klo 11–18. Järjestetään tänä kesänä jo neljättä kertaa. Lisätietoja "
            "myyntipaikoista: winecafejokiranta@gmail.com"
        ),
        "category": "market",
        "location": "Vääksy",
        "start_date": "2026-07-25",
        "organizer": "Wine & Cafe Jokiranta",
        "link": "https://www.facebook.com/profile.php?id=61580238930683",
        "image_url": "https://viikinkitapahtumat.fi/pics/tarinoidentori.jpg",
        "audience": "Yleisö",
        "fight_style": "Western",
    },
    {
        "title_fi": "Ulvilan Keskiaikaiset Hansamarkkinat",
        "description_fi": (
            "Keskiaikaiset Hansamarkkinat järjestetään Ulvilassa joka vuosi elokuun ensimmäinen viikonloppu. "
            "Markkinat järjestetään pääosin talkootyönä Lions Club Ulvila ry:n toimesta ja tilaisuudesta kertyneet "
            "varat jaetaan hyväntekeväisyyteen."
        ),
        "category": "market",
        "location": "Ulvila",
        "start_date": "2026-08-01",
        "end_date": "2026-08-02",
        "organizer": "Lions Club Ulvila ry",
        "link": "https://www.facebook.com/Hansamarkkinat",
        "image_url": "https://viikinkitapahtumat.fi/pics/hansamarkkinat.jpg",
        "audience": "Yleisö",
        "fight_style": "",
    },
    {
        "title_fi": "Wiipurintien markkinat",
        "description_fi": (
            "Keskiaikatapahtuma Wiipurintien markkinat valloittaa Jaalan ja kaikki vierailijatkin 8.8.2026. "
            "Musiikkia, työpajoja, historianelävöitystapahtumia, hevosturnajaisia, teatteria, tanssia ja paljon muuta. "
            "Tervetuloa nauttimaan monikerroksellisesta historiasta. Ennennäkemättömiä ja -kokemattomia esityksiä "
            "ja elämyksiä luvassa koko päiväksi!"
        ),
        "category": "market",
        "location": "Jaala, Liikasenmäki",
        "start_date": "2026-08-08",
        "organizer": "Wiipurintien markkinat",
        "link": "https://www.facebook.com/profile.php?id=100063630098128",
        "image_url": "https://viikinkitapahtumat.fi/pics/viipurintienmarkkinat.jpg",
        "audience": "Yleisö",
        "fight_style": "",
    },
    {
        "title_fi": "Helsingin Keskiaikapäivä",
        "description_fi": (
            "Helsingin Keskiaikapäivä järjestetään Pyhän Laurin kirkon ympäristössä Vantaalla. "
            "Tapahtuman järjestävät yhteistyössä Vantaa-Seura / Vandasällskapet, Tikkurilan seurakunta ja "
            "Vanda svenska församling. Tapahtumaa tukevat Vantaan kaupunki ja Helsingestiftelsen sr."
        ),
        "category": "festival",
        "location": "Vantaa",
        "start_date": "2026-08-22",
        "organizer": "Vantaa-Seura, Tikkurilan Seurakunta, Vanda svenska församling",
        "link": "https://www.facebook.com/@Helsingankeskiaikapaiva",
        "image_url": "https://viikinkitapahtumat.fi/pics/helsinkikeskiaikapaiva.jpg",
        "audience": "Yleisö",
        "fight_style": "",
    },
]


def slug_for(ev):
    return f"{ev['organizer']}::{ev['start_date']}::{ev['title_fi']}"


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()
    upserted = 0
    for ev in EVENTS:
        slug = slug_for(ev)
        existing = await db.events.find_one({"seed_slug": slug})
        doc = {
            "seed_slug": slug,
            "title_fi": ev["title_fi"],
            "title_en": ev.get("title_en", ""),
            "title_sv": ev.get("title_sv", ""),
            "description_fi": ev["description_fi"],
            "description_en": ev.get("description_en", ""),
            "description_sv": ev.get("description_sv", ""),
            "category": ev["category"],
            "location": ev["location"],
            "start_date": ev["start_date"],
            "end_date": ev.get("end_date"),
            "organizer": ev["organizer"],
            "organizer_email": None,
            "link": ev.get("link", ""),
            "image_url": ev.get("image_url", ""),
            "audience": ev.get("audience", ""),
            "fight_style": ev.get("fight_style", ""),
            "status": "approved",
        }
        if existing:
            await db.events.update_one({"seed_slug": slug}, {"$set": doc})
        else:
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = now
            await db.events.insert_one(doc)
        upserted += 1
    print(f"Seeded/updated {upserted} events.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
