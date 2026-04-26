# Viikinkitapahtumat — mobiilisovellus (vaihe 1)

Natiivi mobiilisovellus iOS:lle ja Androidille. Sama data kuin
`viikinkitapahtumat.fi`-sivustolla, mutta optimoitu puhelimelle.

## Tavoite

> "Parempi kuin nettisivu puhelimessa" — käyttäjien sitouttaminen
> applikaatioon ennen kuin myöhemmissä vaiheissa tuodaan maksullisuus
> ja yhteisöominaisuudet.

## Ydinominaisuudet (MVP)

- 🏠 **Etusivu**: korttilista kaikista hyväksytyistä tapahtumista
  - Päivämäärä + paikka näkyvissä heti
  - "Suosikit"-tähti yhdellä napsautuksella
  - Pull-to-refresh
- 🔍 **Haku & suodatus**:
  - Tekstihaku (paikka, nimi, kuvaus)
  - 📍 **Lähellä minua** (GPS, ≤200 km, lupakysely)
  - 📅 Tällä viikolla / Tässä kuussa / Seuraavat 3 kk
- ⭐ **Suosikit**-välilehti: AsyncStorage-tallennus, pysyvät offline-tilassa
- 🗓️ **Kalenteri**-välilehti: tapahtumat ryhmiteltynä kuukausittain
- 📄 **Tapahtumasivu**:
  - Iso kuva + otsikko + maan lippu
  - "Tapahtuman alkuun N päivää" -laskuri
  - **Avaa kartassa** (iOS Apple Maps, Android Google Maps -intent)
  - **Tallenna suosikkeihin**
  - Sivusto-linkki ulkoiseen sivuun
  - Kuvagalleria horisontaalisena swipe-listana

## Teknologiat

- React Native + **Expo SDK 52**
- TypeScript (strict)
- Expo Router (file-based routing)
- AsyncStorage suosikeille
- expo-location GPS:lle
- axios API-kutsuille

## Käyttöönotto

```bash
cd /app/mobile
yarn install            # already done in container
yarn start              # avaa Metro-bundlerin + QR-koodi
```

### Testaaminen omalla puhelimella

1. Asenna **Expo Go** -sovellus puhelimeesi:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
2. Aja `yarn start` projektikansiossa
3. Skannaa terminaaliin tuleva QR-koodi puhelimen kameralla → sovellus avautuu

> Puhelimen ja tietokoneen on oltava samassa Wi-Fi-verkossa. Vaihtoehto:
> käytä `yarn start --tunnel` jos verkkoyhteys ei toimi.

## Konfigurointi

Backend-URL on `app.json`-tiedostossa kohdassa `expo.extra.apiBaseUrl`.
Vaihda tuotanto-URL kun sivusto siirtyy `viikinkitapahtumat.fi`-osoitteeseen:

```json
"extra": {
  "apiBaseUrl": "https://viikinkitapahtumat.fi"
}
```

## Sovellusrakenne

```
app/                    # Expo Router-näkymät
├── _layout.tsx        # Root: Stack + teema
├── (tabs)/
│   ├── _layout.tsx   # Bottom tabs (Etusivu / Suosikit / Kalenteri)
│   ├── index.tsx     # Etusivu (lista + haku + chips)
│   ├── favorites.tsx
│   └── calendar.tsx
└── event/[id].tsx     # Tapahtuman detail-näkymä

src/
├── api/client.ts      # axios + URL-resolveri (GridFS)
├── components/        # EventCard, FilterChip, SearchBar
├── hooks/             # useEvents, useFavorites, useLocation
├── lib/               # theme, format, countries
└── types.ts
```

## Designperiaatteet

- **Tumma viikinki-estetiikka** sivuston tapaan: musta `#0E0B09` tausta,
  ember-punainen `#C8492C`, kulta `#C9A14A`, luunvärinen typografia.
- **Yksi tärkeä toiminto per näyttö** — chips-suodattimet ovat aina näkyvissä,
  mutta eivät häiritse korttilistaa.
- **Lippu kortilla** = nopea visuaalinen tunnistus mistä maasta tapahtuma on.
- **Offline-friendly suosikit** — AsyncStorage säilyttää tähdet ilman serveriä.

## Tulevat vaiheet (ei MVP:ssä)

- Push-notifikaatiot suosikkitapahtumista
- Käyttäjätilit + sosiaaliset toiminnot
- Maksullinen premium-versio (lipunmyynti, "ennakkotarjoukset")
- Offline-tapahtumien välimuisti (esim. ennen leiriä)
- Sora-pohjaiset tapahtumavideo-trailerit (premium)
- Kartan upotus / kävelyreitit tapahtumapaikkaan

## Tunnetut rajoitukset

- Geocode `expo-location.geocodeAsync` toimii vain iOS:llä luotettavasti;
  Androidilla osoitehaku ei aina palauta tulosta. Korjataan vaiheessa 2
  taustakentällä `latitude`/`longitude` tallennuksella jokaiseen tapahtumaan.
- Kuvat ladataan kerran muistiin — ei vielä levyväligointia. Suuren määrän
  tapahtumia lataaminen voi käyttää muistia. FlatList virtualisoi listan.
