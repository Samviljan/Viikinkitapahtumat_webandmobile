# EAS Build — quick start (Android APK + iOS TestFlight)

> **Why?** Web-preview ja Expo Go LAN-setup eivät tue push-notifikaatioita
> tai oikeita laitetestauksia. EAS Build tuottaa asennettavan **.apk**:n
> Androidille ja TestFlight-jakelun iOS:lle.

## Edellytykset

1. **Expo-tili** (ilmainen) — luo: https://expo.dev/signup
2. **Node 20+** + `yarn` lokaalilla koneella
3. iOS-buildiin: **Apple Developer-tili** ($99/v) — Androidille riittää pelkkä Expo-tili

## 1. Kertaluonteinen setup

```bash
cd /app/mobile

# Asenna EAS CLI globaalisti
npm install -g eas-cli

# Kirjaudu Expo-tiliisi
eas login
# → email + password tai SSO-tunnukset

# Yhdistä projekti EAS:iin (luo automaattisesti projectId)
eas project:init
# Hyväksy ehdotettu nimi "viikinkitapahtumat" tai anna oma
# Tämä kirjoittaa app.json:iin oikean projectId:n placeholderin tilalle
```

`eas project:init` korvaa `app.json`:n `__EAS_PROJECT_ID__` -placeholderit
oikealla UUID:lla automaattisesti.

## 2. Android APK (helpoin tapa testaajille)

```bash
eas build --profile preview --platform android
```

- Build pyörii Expo:n pilvessä (~10–15 min)
- Saat suoran latauslinkin: `https://expo.dev/artifacts/eas/<id>.apk`
- Jaa linkki testaajille → he klikkaavat APK:n Android-puhelimeensa
  (lisätietoja: salli "tuntemattomista lähteistä asennus" Android-asetuksista)

**Maksuton tili**: 30 buildia/kk Androidille — riittää beta-vaiheeseen.

## 3. iOS TestFlight (vaatii Apple Developer-tilin)

```bash
eas build --profile production --platform ios

# Kun build on valmis:
eas submit --profile production --platform ios
```

- Ensimmäisellä kerralla: anna Apple Developer credentialit kun kysytään
- App Store Connect lähettää sen TestFlight-vaiheeseen automaattisesti
- Kutsu testaajat App Store Connect → TestFlight → Internal/External testers

## 4. Tuotantopaketit (valmiit Play Store / App Store)

```bash
eas build --profile production --platform all
```

Submitoi kauppoihin:
```bash
eas submit --profile production --platform android  # tarvitsee Google Play Console
eas submit --profile production --platform ios      # tarvitsee Apple Developer
```

## API-osoitteen vaihtaminen tuotantoa varten

Kun haluat julkaista tuotantopaketin joka osoittaa tuotannon backendiin
preview:n sijaan:

```jsonc
// app.json
"extra": {
  "apiBaseUrl": "https://viikinkitapahtumat.fi"
}
```

Build sen jälkeen `--profile production`.

## Vianmääritys

- **"This project is not configured to use EAS Update"**: aja
  `eas update:configure` tai poista `runtimeVersion`/`updates`-blokit
  `app.json`:sta jos et halua OTA-päivityksiä.
- **iOS bundle identifier on jo käytössä**: vaihda `app.json` →
  `ios.bundleIdentifier` toiseen arvoon (esim. lisää `.beta`).
- **Build epäonnistuu Java/Gradle-virheillä**: käytä
  `eas build --profile preview --platform android --clear-cache`.

## Hyödyllisiä komentoja

```bash
eas build:list                    # listaa kaikki buildit
eas build:view <build-id>         # yksittäisen buildin tila
eas update --branch preview --message "Hot fix"   # OTA-päivitys ilman uutta buildia
eas device:create                 # rekisteröi iOS-laitteen testaukseen
```

## Tärkeää tietoturvasta

- **ÄLÄ** committaa Apple Developer credentialeja repoon — EAS tallentaa ne
  Expo:n palvelimelle
- **JWT-tokenit ja API-osoitteet** ovat client-puolen koodissa → käytä
  julkista API:a, ei admin-credentialeja
- Beta-paketit (`preview`-profiili) **eivät** ole signattu Play Store/App Store
  -kelpoisiksi; käytä vain testaukseen
