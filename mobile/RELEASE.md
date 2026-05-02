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
