# FCM (Firebase Cloud Messaging) -asennusohje — Viikinkitapahtumat Mobile

**Aiempi virhe käyttäjän laitteella (build 0.4.5):**

```
EXCEPTION · Make sure to complete the guide at https://docs.expo.dev/push-notifications/fcm-credentials/
Default FirebaseApp is not initialized in this process fi.viikinkitapahtumat.mobile.
Make sure to call FirebaseApp.initializeApp(Context) first.
```

**Syy:** Expo SDK 54 vaatii Androidilla Firebase-konfiguraation (`google-services.json`) sekä FCM V1 -palvelutilin (Service Account) avaimen, jotka EAS bundlaa rakennusvaiheessa. Build 0.4.5:ssä näitä ei ollut → Firebase ei käynnisty laitteella → push-token-pyyntö epäonnistuu.

**Mitä on JO TEHTY koodissa (build 0.4.6, versionCode 15):**
- ✅ `app.json` viittaa nyt `./google-services.json` -tiedostoon (`android.googleServicesFile`).
- ✅ `expo-notifications`-plugin lisätty `plugins`-listaan default-channel + brand-värillä.
- ✅ `POST_NOTIFICATIONS`-lupa Android 13+:lle lisätty.
- ✅ `.gitignore`: `google-services.json`, `GoogleService-Info.plist` ja FCM service-account JSON-tiedostot eivät enää vahingossa committoidu.

**Mitä SINÄ TEET nyt (kerran tehtävä, ~15 min):**

---

## Vaihe 1 — Luo Firebase-projekti

1. Mene osoitteeseen https://console.firebase.google.com ja kirjaudu sillä Google-tilillä, jolla haluat hallita Viikinkitapahtumien push-pavelua.
2. Klikkaa **"Add project"** ja anna nimi (esim. `viikinkitapahtumat-mobile`).
3. Google Analytics on vapaaehtoinen — voit ottaa pois käytöstä jos haluat.
4. Klikkaa **"Create project"** ja odota että projekti valmistuu (~30 s).

## Vaihe 2 — Rekisteröi Android-sovellus

1. Projektin etusivulla klikkaa **Android-kuvaketta** (`</>` voi olla iOS/web — valitse Android-robotti).
2. **Android package name (PAKOLLINEN, EI VOI MUUTTAA MYÖHEMMIN):**
   ```
   fi.viikinkitapahtumat.mobile
   ```
   ⚠️ Kirjoita täsmälleen näin — pienillä kirjaimilla ja täsmälleen samalla muodolla kuin `app.json`:n `android.package`.
3. App nickname (valinnainen): `Viikinkitapahtumat`
4. Debug signing certificate SHA-1: VOIT JÄTTÄÄ TYHJÄKSI (push-viestit eivät tarvitse sitä). Jos haluat lisätä, käytä SHA-1:tä: `96:25:57:2D:5B:F5:40:C0:28:38:4A:B6:F0:F7:08:F5:B0:E3:90:2B`
5. Klikkaa **"Register app"**.

## Vaihe 3 — Lataa `google-services.json`

1. Seuraavalla sivulla näkyy painike **"Download google-services.json"** — klikkaa ja tallenna tiedosto.
2. Kopioi tiedosto suoraan kansioon `/app/mobile/google-services.json` (SAMA TASO kuin `app.json`).
3. **ÄLÄ commitoi tätä tiedostoa Gittiin** — `.gitignore`:ssä on jo sääntö joka estää sen, mutta varmista vielä `git status` -komennolla.
4. Klikkaa Firebase Console -sivulla **"Next" → "Next" → "Continue to console"** — voit ohittaa Add Firebase SDK / Run app -vaiheet, ne ovat natiivipohjaisia ohjeita joita Expo hoitaa puolestasi.

## Vaihe 4 — Luo FCM V1 -palvelutilin avain (Service Account)

1. Firebase Console: klikkaa **rataskuvaketta** (vasen yläkulma, projektin nimen vieressä) → **"Project settings"**.
2. Yläosassa olevat välilehdet: klikkaa **"Service accounts"**.
3. Klikkaa **"Generate new private key"** → vahvistuspopupissa **"Generate key"**.
4. Selain lataa `<projektinimi>-firebase-adminsdk-XXXXX.json` -tiedoston.
5. **Pidä tämä tiedosto turvassa.** Se antaa täydet oikeudet lähettää push-viestejä Firebase-projektiisi.

## Vaihe 5 — Lataa palvelutiliavain EAS:lle

Avaa pääte koneessasi `/app/mobile`-kansiossa (jos käytät Emergent-ympäristön bashia, avain pitää olla saatavilla — voit ladata sen ensin sinne SCP:llä tai liittää sisällön suoraan).

```bash
cd /app/mobile

# Kirjautumistila pitää olla aktiivinen (EXPO_TOKEN tai expo login)
eas credentials
```

Vastaa kysymyksiin:
1. Platform → **android**
2. Build profile → **production**
3. Mitä hallita → **"Google Service Account"**
4. Sub-menu → **"Manage your Google Service Account Key for Push Notifications (FCM V1)"**
5. → **"Set up a Google Service Account Key for Push Notifications (FCM V1)"**
6. → **"Upload a new service account key"**
7. Anna polku service-account JSON-tiedostoon, jonka latasit Firebase Consolesta.

EAS lataa avaimen palvelimilleen kryptattuna. Voit nyt poistaa paikallisen JSON-tiedoston tai pitää sen `.secrets/`-kansiossa (gitignored).

## Vaihe 6 — Rakenna uusi AAB

```bash
cd /app/mobile
eas build --profile production --platform android
```

Build käyttää uutta `app.json`-konfiguraatiota:
- `googleServicesFile: "./google-services.json"` → Expo bundlaa Firebase-konfiguraation natiiviin koodiin
- `expo-notifications`-plugin → notification channel + ikoni
- FCM V1 service-account-avain otetaan EAS Cloudista

Versio: **0.4.6**, versionCode: **15** (auto-increment EAS:llä).

## Vaihe 7 — Lataa AAB Play Consoleen

1. Build valmistuu ~10–15 min, lataa `.aab`-tiedosto Expo Build -sivulta.
2. Play Console → Release → **Closed testing** → **Create new release** → upload AAB.
3. Käytä testaajien linkkiä → asenna laitteelle → kirjaudu sisään → **Profiili → Diagnostic-painike**.

**Odotettu tulos:**
```
Device: SM-A566B · android
API: https://viikinkitapahtumat.fi
OK · Signed in as admin@viikinkitapahtumat.fi
OK · Physical device confirmed
OK · Android notification channel set
Permission (existing): granted
OK · Notification permission granted
OK · Project ID: 73281723...
OK · Expo Push Token: ExponentPushToken[xxxxxxxxxxxxxx]
OK · Token registered with backend
```

**Sen jälkeen:**
- Token tallennetaan `users.expo_push_tokens`-kenttään automaattisesti.
- Admin Dashboard → `/admin/messages` → "Push Health" -kortti näyttää `users_with_push_token: 1+`.
- "Send test" -nappi lähettää testi-pushin.

---

## Tarkistuslista

- [ ] Firebase-projekti luotu
- [ ] Android-sovellus rekisteröity package nameen `fi.viikinkitapahtumat.mobile`
- [ ] `google-services.json` ladattu osoitteeseen `/app/mobile/google-services.json`
- [ ] FCM V1 service-account JSON ladattu Firebase Consolesta
- [ ] `eas credentials` -komento ladannut service-account-avaimen EAS:lle
- [ ] Uusi `eas build --profile production --platform android` käynnistetty
- [ ] AAB ladattu Play Console -closed-testing-trackiin
- [ ] Diagnostic-painike laitteella → "OK · Expo Push Token: ..."

---

## Vianmääritys

**"Default FirebaseApp is not initialized" toistuu uudessa buildissa:**
- Tarkista että `google-services.json` on EXACTLY `/app/mobile/google-services.json` (ei `mobile/google-services.json` eikä `assets/google-services.json`).
- Tarkista että package name `google-services.json`-tiedostossa täsmää tarkalleen `fi.viikinkitapahtumat.mobile` — avaa tiedosto ja etsi `package_name`-kentästä.
- Aja `eas build --clear-cache` (puhdas build).

**"Project ID not found" -virhe:**
- Tarkista että `extra.eas.projectId` (`73281723-f172-4938-8fc0-c1feee70bc51`) on edelleen `app.json`:ssa. Tämä on EAS-projekti, EI Firebase-projekti — molemmat tarvitaan rinnakkain.

**Push-tokenin saaminen onnistuu mutta viestit eivät tule perille:**
- Tarkista Admin Dashboard → `/admin/messages` → "Send test" → katso `sent_push`/`recipients` -lukuja.
- Jos `recipients=1` mutta `sent_push=0`, FCM V1 service-account ei ole oikein konfiguroitu EAS:ssä — toista vaihe 5.
- Backendin `EXPO_ACCESS_TOKEN` -ympäristömuuttuja (vapaaehtoinen) parantaa rate-limit-suojausta tuotannossa.

---

## iOS (myöhempi vaihe)

iOS-pushit vaativat erillisen Apple Developer -tilin ($99/v) ja APNs Key:n (`.p8`). Tämä on dokumentoitu erikseen `IOS_BUILD_GUIDE.md`-tiedostossa kun siirrymme TestFlight-vaiheeseen.

iOS:lle tarvitaan:
- `GoogleService-Info.plist` (Firebase iOS-rekisteröinnistä)
- APNs Key (`.p8`) Apple Developerista
- `eas credentials` → ios → upload APNs Key
- `app.json` → `ios.googleServicesFile: "./GoogleService-Info.plist"`
