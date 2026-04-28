# EAS Build — quick start (Android AAB for Play Console + iOS TestFlight)

> **Why?** Web-preview ja Expo Go LAN-setup eivät tue push-notifikaatioita
> tai oikeita laitetestauksia. EAS Build tuottaa Play Console -kelpoisen
> **.aab**:n Androidille ja TestFlight-jakelun iOS:lle.

## Edellytykset

1. **Expo-tili** (ilmainen) — luo: https://expo.dev/signup
2. **Node 20+** + `yarn` lokaalilla koneella
3. iOS-buildiin: **Apple Developer-tili** ($99/v) — Androidille riittää pelkkä Expo-tili
4. **Google Play Console** -tili (ennen ensimmäistä julkaisua, $25 kertamaksu)

## 1. Kertaluonteinen setup

```bash
cd /app/mobile

# Asenna EAS CLI globaalisti
npm install -g eas-cli

# Kirjaudu Expo-tiliisi
eas login
# → email + password tai SSO-tunnukset
```

EAS-projektin ID on jo määritetty `app.json`:ssa (`extra.eas.projectId`),
joten `eas project:init`-vaihetta ei tarvita.

## 2. Android AAB Play Consolea varten (PROD)

`eas.json:n` `production`-profiili tuottaa `.aab`-tiedoston jonka voi suoraan ladata
Play Console → Internal testing / Production. `versionCode` nostetaan automaattisesti
joka buildilla (`autoIncrement: true`).

```bash
cd /app/mobile
eas build --profile production --platform android
```

- Build pyörii Expo:n pilvessä (~10–15 min)
- Saat suoran latauslinkin: `https://expo.dev/artifacts/eas/<id>.aab`
- Lataa .aab Play Consoleen: **Release → Internal testing → Create new release → Upload .aab**
- (Tai jos Play Console -credentialit on jo annettu EAS:lle: `eas submit --profile production --platform android`)

**Maksuton tili**: 30 buildia/kk Androidille — riittää alpha/beta-vaiheeseen.

## 3. Android APK (sisäinen testaus ennen Play Consolea)

Jos haluat jakaa APK:ta suoraan testaajille (ei Play Consolen kautta), käytä
`preview`-profiilia:

```bash
eas build --profile preview --platform android
```

- Saat APK-latauslinkin
- Jaa linkki testaajille → he asentavat puhelimeen "tuntemattomista lähteistä"

## 4. iOS TestFlight (vaatii Apple Developer-tilin)

```bash
eas build --profile production --platform ios

# Kun build on valmis:
eas submit --profile production --platform ios
```

## 5. Buildaus CI:stä / palvelimelta (ilman interaktiivista login:ia)

```bash
export EXPO_TOKEN="<token from https://expo.dev/accounts/<user>/settings/access-tokens>"
cd /app/mobile
eas build --profile production --platform android --non-interactive --no-wait
```

`EXPO_TOKEN` on suositeltu tapa CI/CD-pipelineissä, koska sen voi rajata ja peruuttaa.

`--no-wait` palauttaa terminaalille heti — buildin tilannetta voi seurata
osoitteessa https://expo.dev/accounts/<user>/projects/viikinkitapahtumat/builds

## Vianmääritys

- **"This project is not configured to use EAS Update"**: aja
  `eas update:configure` tai poista `runtimeVersion`/`updates`-blokit
  `app.json`:sta jos et halua OTA-päivityksiä.
- **iOS bundle identifier on jo käytössä**: vaihda `app.json` →
  `ios.bundleIdentifier` toiseen arvoon (esim. lisää `.beta`).
- **Build epäonnistuu Java/Gradle-virheillä**: käytä
  `eas build --profile production --platform android --clear-cache`.
- **"Version code already used in Play Console"**: nosta `app.json` →
  `android.versionCode` arvoa manuaalisesti tai tarkista että
  `eas.json` → `production.autoIncrement` on `true`.

## Hyödyllisiä komentoja

```bash
eas build:list                    # listaa kaikki buildit
eas build:view <build-id>         # yksittäisen buildin tila
eas update --branch production --message "Hot fix"   # OTA-päivitys ilman uutta buildia
eas device:create                 # rekisteröi iOS-laitteen testaukseen
```

## Tärkeää tietoturvasta

- **ÄLÄ** committaa Apple Developer credentialeja repoon — EAS tallentaa ne
  Expo:n palvelimelle
- **JWT-tokenit ja API-osoitteet** ovat client-puolen koodissa → käytä
  julkista API:a, ei admin-credentialeja
- Beta-paketit (`preview`-profiili, APK) **eivät** ole Play Store -kelpoisia;
  käytä vain testaukseen. Play Storeen tarvitaan AAB (`production`-profiili).
