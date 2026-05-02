# Mobile release process

Quick reference for publishing updates to the Android app. Keep this doc
simple — the `package.json` scripts do the heavy lifting.

## TL;DR

| Change type | Command | Play Store step? | Time |
|---|---|---|---|
| JS/UI only (text, bug fix, new screen using existing native modules) | `yarn update:prod` | No — OTA push | 2 min |
| Native dependency added or SDK upgraded | `yarn build:prod` | Yes — upload AAB | ~25 min |

## Why two paths?

Expo has two update mechanisms:

1. **OTA updates** (`eas update`) — push a new JS bundle to devices already
   running the latest native build. Fast, no Play Store review. Runs only
   on devices whose `runtimeVersion` matches the published update.
2. **Native builds** (`eas build`) — rebuild the APK/AAB with new native
   code. Required whenever you change `package.json` native dependencies,
   `app.json` native config, or bump Expo SDK. Must go through Play Console.

## Production build (native AAB)

```bash
cd mobile
yarn build:prod
```

This runs two steps:

1. `node scripts/bump-version.js patch` → bumps `app.json` `expo.version`
   by one patch (e.g. `0.4.9 → 0.4.10`). This is **critical**: if you
   reuse the same `versionName` across two different `versionCode`s, the
   Play Store cache on users' phones gets confused and they either don't
   see the update or have to clear app data manually.
2. `eas build --platform android --profile production --non-interactive`
   → EAS Cloud Build compiles the AAB. `versionCode` auto-increments via
   `autoIncrement: true` in `eas.json`.

When the build finishes, download the AAB from the Expo dashboard URL
printed at the end, then upload to Google Play Console → Production track.

### Version bump options

```bash
yarn bump:patch   # 0.4.9 → 0.4.10  (default — bug fixes)
yarn bump:minor   # 0.4.9 → 0.5.0   (new features)
yarn bump:major   # 0.4.9 → 1.0.0   (breaking/major release)
```

Use patch for almost everything. Minor/major rarely.

## OTA update (JS-only changes)

```bash
cd mobile
yarn update:prod
```

This pushes the current JS bundle to all devices running a native build
with the same `runtimeVersion`. `runtimeVersion` follows `expo.version`
(via `runtimeVersion: {policy: "appVersion"}` in `app.json`), so only
devices running the exact native `versionName` currently in `app.json`
receive the update.

### Important rule for OTA

**DO NOT bump `expo.version` before an OTA update.** If you do, the
`runtimeVersion` changes and the update is published for a version no
user's device is running yet — the update lands in nobody's phone.

Only bump `expo.version` when you're preparing the next native build.

## Troubleshooting

### Play Store doesn't show update after upload

1. Check Play Console → Release → Overview: status should be `Available`
2. Wait — Production track can take 2-48 hours for rollout
3. Verify your Google account is on the relevant testing track
4. As a last resort, have the user clear Play Store cache (Settings →
   Apps → Google Play Store → Clear cache)

If #4 is the fix, the next build probably had the same `versionName` as
the previous — always use `yarn build:prod` which bumps it automatically.

### Mobile app shows "Request failed with code 520"

Backend is unreachable. 520 = Cloudflare got an empty response from the
Emergent deployment origin. Redeploy the backend from the Emergent
dashboard. Mobile app itself is fine.

### OTA didn't reach devices

Common causes:

- Device's native build has a different `runtimeVersion` than the
  published update. Check `expo.version` in `app.json` vs what's on the
  device (Settings → Apps → viikinkitapahtumat → App info)
- Device hasn't opened the app since you published. OTA downloads on
  app launch, so the user needs to background+foreground once.
- Expo dashboard → Updates → Latest — verify the update was published
  to the correct branch (`production`) and channel (`production`).

---

## Release notes — viimeisimmät buildit

### v0.4.9 (versionCode 23) — toukokuu 2026 _(nykyinen / rakenteilla)_

**Kauppiaskortit ja merchant-detail-näyttö**
- Uusi "Hanki kauppiaskortti" CTA (Web + Mobile) joka ohjaa rekisteröinnin
  tai in-app-lomakkeen kautta — mailto-flow poistettu.
- Uusi `merchant_card_requests`-kokoelma backendissä + admin-paneliin
  oma "Kauppiaspyynnöt"-sivu badge-laskurilla. Admin-approve
  aktivoi käyttäjän kauppiaskortin automaattisesti (12 kk subscription,
  shop_name/category/description kopioidaan pyynnöstä).
- Kauppiaskortti näkyy premium-merkittynä oman kategoriansa kärjessä
  ("Premium-kauppiaat" + divider + "Muut kauppiaat"). Ei enää top-hero
  duplikaattia.
- **Mobiili**: merchant-kortin thumbnail pienennetty näkyväksi,
  kortti on klikattava → uusi `/shops/[id]` merchant-detail-näyttö
  kuvalla, yhteystiedoilla, verkkosivulinkillä ja suosikki-vaihdolla.
- Välilehden nimi mobiilissa `"Kauppiaat" → "Kaupat"` (mahtuu paremmin).

**In-app -viesti-inbox**
- Uusi `user_messages`-kokoelma + 6 endpointtia (inbox, sent, soft-delete,
  auto-mark-read).
- Web: yläpalkin mail-ikoni ember-pillillä näyttää lukematon-laskurin.
- **Mobiili: Viestit-välilehti siirretty pää-tab-bariin** (näkyy vain
  kirjautuneille, ember-badge lukematon-laskurille). 3 välilehteä
  (Saapuneet / Lähetetyt / Lähetä uusi).
- Paid-messaging-käyttäjien RSVP-kohtainen viestikvootta (presetit
  A=10, B=20, C=30, D=vapaa), per-event-kvoottanäkymä UI:ssa.

**AI-oletuskuvat + kauppiaslajittelu**
- 12/12 AI-oletuskuvaa GridFS:ssä (Gemini Nano Banana) 6 kategoriaan
  — käytetään tapahtumille joissa ei ole käyttäjän kuvaa.

**Infra ja tuotanto**
- **Backend 520 crash -fix**: `ADMIN_PASSWORD` ja `JWT_SECRET`
  fallback-logiikka startup-eventiin, estää Cloudflare 520:n jos env
  puuttuu tuotannosta.
- **`bump-version.js` + `yarn build:prod`** — automaattinen versionName
  patch-bump jotta Play Store ei enää cachea vanhaa versiota.

---

### v0.4.8 (versionCode 21) — huhti-toukokuu 2026

**Web↔mobiili favorites-sync**
- Backend (`users.favorite_event_ids`) on nyt totuuslähde — web ja
  mobiili näkevät samat suosikit.
- 4 uutta endpointtia: GET/POST/DELETE/PUT `/api/users/me/favorites`.
- Anonyymien localStorage/AsyncStorage-suosikit migratoituvat serveriin
  kirjautumisen yhteydessä.

**Mobiili — Tapahtumani-välilehti**
- Uusi filter-chip (Suosikit / Osallistun / Molemmat), default
  "Molemmat". Tyhjätilan info-teksti per filter.

**Moderator-rooli + password-reset-kovennus**
- `users.is_moderator: bool`, 33 endpointtia siirretty hyväksymään
  moderaattori (5 jäi admin-only: password rotation, paid-messaging
  toggle, moderator-toggle, POST admin-users, admin promotion).
- `DELETE /admin/users/{id}` estää moderaattoria poistamasta admineja
  (403).
- Forgot-password: delivery-osoite luetaan `users[email]`:stä,
  ei request-payloadista — tamper-resistant.

**Käyttäjäkohtainen kielivalinta (web)**
- `users.language`-kenttä, `PATCH /auth/profile` + `/me` palauttaa.
- Login↔logout↔re-login -testi: User A (en) → B (sv) → A palasi en,
  ei vuotanut B:ltä.

**Paid messaging — per-event-kvootta**
- `message_log`-laskuri (sender_id, event_id) + 429-vastaus yli
  rajan. Admin-viestit eivät kuluta kvootaa.
- Globaali `system_config.messaging_quota` (presetit A/B/C/D).
- Viesteihin lisätään automaattisesti `— {nickname}` (push+email).
- Uusi GET `/api/messages/quota/{event_id}` per-käyttäjä-kvoottatilaan.
- Mobiili: quota-indikaattori composer-näytöllä.
