# Viikinkitapahtumat — Google Play Store -julkaisuopas (vaihe-vaiheelta)

Tämä on tiivistetty checklist Play Storeen julkaisua varten. Käyttöjärjestys ylhäältä alas.

---

## Vaihe 0 — ennen kuin aloitat Play Consolessa

- ✅ EAS production AAB -build käynnissä: https://expo.dev/accounts/samviljan/projects/viikinkitapahtumat/builds/5c2111e4-e313-4d56-86f5-efb97e5e5b15
- ✅ Keystore varmuuskopioitu Google Driveen ja salasanahallintaan
- ✅ Privacy Policy julkaistu: https://viikinkitapahtumat.fi/privacy *(kun web-deploy on tehty — tällä hetkellä toimii vain preview-osoitteessa)*
- ✅ Play Developer -tili maksettu ($25)

---

## Vaihe 1 — Luo uusi sovellus Play Consolessa

1. Avaa https://play.google.com/console
2. Klikkaa **"Create app"** (oikealla ylhäällä)
3. Täytä:
   - **App name**: `Viikinkitapahtumat`
   - **Default language**: Finnish (Finland)
   - **App or game**: App
   - **Free or paid**: Free
   - Hyväksy molemmat declarationit (Developer Program Policies + US export laws)
4. Klikkaa **Create app**

---

## Vaihe 2 — Pakollinen "App content" -checklist

Vasen sivunavi → **Policy → App content**. Käy läpi seuraavat:

### 2.1 Privacy policy
- URL: `https://viikinkitapahtumat.fi/privacy`
- *Huom*: tämä sivu pitää olla julkisesti saatavilla, ei pelkästään preview-osoitteessa. Päivitä web-deploy ennen kuin lähetät tämän.

### 2.2 App access
- "All functionality is available without restrictions" (ei kirjautumista)

### 2.3 Ads
- "No, my app does not contain ads"

### 2.4 Content rating
- Aloita IARC-kysely
- Vastaukset (Viikinkitapahtumat-sovellukselle):
  - Violence: **No**
  - Sexual content: **No**
  - Profanity: **No**
  - Controlled substances: **No**
  - Gambling: **No**
  - User interaction: **No** (käyttäjät eivät kommunikoi keskenään sovelluksessa)
  - Personal info shared: **No** (tapahtumailmoitukset moderoidaan ennen julkaisua)
  - Location sharing: **No** (sijainti pysyy laitteella)
  - Digital purchases: **No**
- Tulos: **Everyone / 3+**

### 2.5 Target audience
- Target age range: **18+** (suosittu vaihtoehto: 13+ — sovellus ei kerää alaikäisten tietoja)
- ⚠️ Jos valitset 13+, joudut täyttämään lisäkysymyksiä Family-policyyn liittyen. **Suosittelen valitsemaan 18+** koska tapahtumissa voi olla taistelusisältöä.

### 2.6 Data safety
Käytä `play-store-listing.md`-tiedoston "Data Safety" -osiota täydellisinä vastauksina.

Tärkeät tarkistuslistat:
- ✅ "Does your app collect or share user data?" → **Yes**
- ✅ "Is all of the user data collected by your app encrypted in transit?" → **Yes**
- ✅ "Do you provide a way for users to request that their data is deleted?" → **Yes**
- Tietolajit kerätään:
  - **Location → Approximate location** (purpose: App functionality, optional, not stored on server)
  - **Personal info → Email** (purpose: Communications, only if user opts in)
- Ei muita.

### 2.7 Government apps
- "No"

### 2.8 News apps
- "No"

### 2.9 COVID-19 contact tracing
- "Not a tracing app"

### 2.10 Financial features
- "None"

---

## Vaihe 3 — Store listing (kauppasivun sisältö)

Vasen sivunavi → **Grow → Store presence → Main store listing**

### 3.1 Sovelluksen tiedot (Finnish — default)
Kopioi `play-store-listing.md`-tiedostosta:
- **App name**: Viikinkitapahtumat
- **Short description**: (kts. md)
- **Full description**: (kts. md)

### 3.2 Graphics
- **App icon**: 512×512 px (PNG, ei läpinäkyvyyttä)
  - Käytä `/app/mobile/assets/icon.png` lähteenä → skaalaa 512×512:ksi
- **Feature graphic**: 1024×500 px
  - Tämä tulee Play Storen kauppasivun ylälaitaan kun käyttäjä avaa sovelluksesi
- **Phone screenshots** (vähintään 2, suositus 4–8): vähintään 320×320 px, max 3840 px
  - Suositus: 1080×1920 (vakiomobiili 16:9)
  - Mitä kuvata: (1) Etusivu kalenteri, (2) Tapahtuman detalji, (3) Kaartit, (4) Suosikit
- **(Valinnainen) Tablet screenshots**: skip
- **(Valinnainen) Promo video**: skip

### 3.3 Categorisation
- **Application type**: App
- **Category**: Events
- **Tags** (3 max): Calendar, Local, Entertainment

### 3.4 Contact details
- **Email**: admin@viikinkitapahtumat.fi
- **Website**: https://viikinkitapahtumat.fi
- **Phone**: (valinnainen, voi jättää tyhjäksi)

---

## Vaihe 4 — Lataa AAB Internal Testing -trackiin

Vasen sivunavi → **Test and release → Testing → Internal testing**

1. Klikkaa **Create new release**
2. **App signing**: Hyväksy Google Play App Signing → tämä on tärkein turvavaihe!
3. **Upload AAB**: lataa EAS-buildin tuottama `.aab`-tiedosto
   - Lataa se Expo-build-sivulta (https://expo.dev/accounts/samviljan/projects/viikinkitapahtumat/builds/5c2111e4-…)
4. **Release name**: `0.2.0` (samma kuin app.json)
5. **Release notes** (FI):
   ```
   • Ensimmäinen Play Store -julkaisu beta-testiin
   • Pohjoisen viikinki- ja rauta-aikatapahtumat yhdessä kalenterissa
   • Tietoa-näyttö ja "Jaa sovellus" -toiminto
   ```
6. Klikkaa **Save** → **Review release** → **Start rollout to Internal testing**

### 4.1 Lisää testaajat
- Sama sivu → **Testers** -välilehti
- Luo **Email list**: lisää 5–20 sähköpostia (oma + ystävät + harrastusyhteisö)
- Kopioi **Opt-in URL** ja jaa testaajille
- Testaajat kirjoittavat URLiin → klikkaavat "Become a tester" → asentavat Playstä normaalisti

---

## Vaihe 5 — Promote to Production

Kun olet tyytyväinen Internal testing -palautteisiin:

1. **Production**-osio vasemmalla
2. Klikkaa **Create new release** → valitse "Use the same release as Internal testing"
3. Tarkista **kaikki vihreät checkmarkit** (App content, Store listing, Pricing & distribution)
4. **⚠️ Uusilla developer-tileillä on 14 päivän pakollinen testausjakso** — voit tehdä Promote to Production vasta kun tilisi on ollut Closed testingissä riittävän kauan
5. Klikkaa **Review release** → **Submit for review**
6. Google reviewaa tyypillisesti 3–7 päivässä

---

## Vaihe 6 — EAS Submit (valinnainen, helpottaa päivityksiä)

Kun olet päässyt vaiheen 4 läpi kerran manuaalisesti, automatisoidaan tulevat päivitykset:

### 6.1 Luo Google Service Account JSON
1. Avaa https://console.cloud.google.com/iam-admin/serviceaccounts
2. Valitse projekti, jonka Play Console linkitti automaattisesti tilillesi
3. Create Service Account → nimi: `eas-submit`
4. Anna roolit: **Service Account User**
5. Avaa luotu account → **Keys** → **Add Key** → **JSON** → lataa
6. Mene takaisin Play Consoleen → **Setup → API access** → linkitä Service Account → anna oikeudet "Release apps to testing tracks" + "Edit and delete draft apps"

### 6.2 Lisää JSON repoon
```bash
mkdir -p /app/mobile/.secrets
mv ~/Downloads/eas-submit-service-account.json /app/mobile/.secrets/
chmod 600 /app/mobile/.secrets/eas-submit-service-account.json
# (.secrets/ on jo .gitignored)
```

### 6.3 Päivitä eas.json
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./.secrets/eas-submit-service-account.json",
        "track": "internal",
        "releaseStatus": "draft"
      }
    }
  }
}
```

### 6.4 Käytä jatkossa:
```bash
cd /app/mobile
EXPO_TOKEN="..." eas build --platform android --profile production --auto-submit
```

→ EAS rakentaa AAB:n + uploadaa sen Play Storeen automaattisesti.

---

## Vaihe 7 — Tulevat päivitykset

Joka kerta kun julkaiset päivityksen:

1. Päivitä `app.json`:n `version` (semver: 0.2.0 → 0.2.1 → 0.3.0)
2. **versionCode kasvaa automaattisesti** (eas.json `autoIncrement: true`)
3. Aja `eas build --platform android --profile production --auto-submit`
4. Avaa Play Console → vahvista uusi release → julkaise

---

## Aikajana yhteenveto

| Päivä | Toiminta |
|-------|----------|
| **Päivä 1 (tänään)** | EAS-build valmis, Play Console -tili luotu, AAB ladattu Internal testingiin |
| **Päivät 2–14** | Beta-testaus 5–20 testaajalla, palautteen kerääminen, mahdolliset bug-fixit |
| **Päivä 15** | Promote to Production → Submit for review |
| **Päivät 16–22** | Google review (yleensä 3–7 pv) |
| **Päivä 23+** | 🎉 Sovellus julkisesti Play Storessa |

---

## Yleisimmät kompastuskivet

❌ **"Privacy policy URL must be publicly accessible"**
→ Varmista että `viikinkitapahtumat.fi/privacy` toimii (ei pelkkä preview-URL).

❌ **"Your app uses sensitive permissions and is missing a Permissions Declaration"**
→ Sijaintilupa tarvitsee perusteltu kuvauksen Data Safety -lomakkeessa.

❌ **"Your app needs to support Android 14 (API level 34)"**
→ Expo SDK 51+ jolla buildaat täyttää tämän automaattisesti. ✅

❌ **"Your app contains undocumented in-app purchases"**
→ Et käytä in-app -ostoksia. ✅

❌ **"Your app uses Advertising ID"**
→ Et käytä mainoksia eikä advertising-ID:tä. ✅
