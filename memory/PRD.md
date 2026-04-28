# Viikinkitapahtumat — PRD

## Original problem statement
Modernise https://viikinkitapahtumat.fi with: visually better calendar/event listing, public event submission with admin moderation, mobile-friendly experience, and a synced mobile app.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB), JWT (PyJWT) + bcrypt, all routes under `/api`.
- **Frontend**: React 19 + Tailwind + shadcn/ui + React Router v7. PWA via `public/manifest.json` and `public/service-worker.js`.
- **Mobile**: PWA (installable, offline shell). Native React Native app deferred.
- **Auth**: JWT in httpOnly cookie + Bearer token (localStorage fallback). Single admin seeded from `.env`.
- **i18n**: Custom Context provider, FI/EN/SV.
- **Theme**: "Hand-forged almanac" — Cormorant Garamond + Cinzel + Outfit, ember red + bone + gold on dark charred wood.

## User personas
1. **Visitor** (Finnish viking enthusiast): browses calendar/list, filters by category, opens event details.
2. **Event organiser**: submits events via public form (no login), waits for admin approval.
3. **Admin** (site owner): logs in, reviews pending submissions, approves/rejects/deletes.

## Core requirements (static)
- Multi-language (FI/EN/SV) selectable.
- Visually rich calendar (month grid) + list view.
- Public event submission with `status=pending` until admin approves.
- Admin moderation dashboard.
- Mobile-first, PWA installable.
- Viking aesthetic, accessible contrast.

## What's been implemented (v1 — 2026-04-25)
- ✅ JWT auth (login, me, logout, admin seed, idempotent password rotation).
- ✅ Event CRUD with multilang fields, 6 categories, status workflow.
- ✅ Public submission form (auto status=pending).
- ✅ Public listing with category filter & date range.
- ✅ Admin dashboard: pending/approved/rejected/all tabs, approve/reject/delete, stats.
- ✅ Custom hand-carved monthly almanac calendar component.
- ✅ Event detail page with image, organizer, link.
- ✅ Static pages: About, Courses (filtered to category=course), Guilds, Shops.
- ✅ Multi-language switcher (FI/EN/SV) with localStorage persistence.
- ✅ PWA manifest + service worker (offline-first shell, never caches `/api/`).
- ✅ Mobile responsive header with hamburger drawer.
- ✅ Localised admin toast/confirm messages.
- ✅ 28/28 backend tests + frontend e2e all green.

## Iteration 2 — Real content imported (2026-04-25)
- ✅ Added new pages: **Viikinkimiekkailu** (`/swordfighting`) with two long-form articles and **Yhteydenotto** (`/contact`) with mailto form + copy-email button. Both are in the main nav in all 3 languages.
- ✅ Extended Event model with optional `audience` (Yleisö / Harrastajat) and `fight_style` (Western / Eastern / …) fields. Surfaced on EventCard + EventDetail + Admin dashboard. Added selects to the Submit form.
- ✅ Seeded **12 real 2026 events** from viikinkitapahtumat.fi via idempotent `/app/backend/scripts/seed_events.py`.
- ✅ Replaced placeholder Guilds list with the real **SVTL** federation section + **6 SVTL member clubs** + **15 other guilds/associations**.
- ✅ Replaced placeholder Shops list with **17 gear/supply shops** + **2 smiths**.
- ✅ Rewrote Courses page with intro + dynamic course-event listing.
- ✅ 37/37 backend tests + frontend e2e green.

## Iteration 3 — AI images, newsletter, iCal, admin email (2026-04-25)
- ✅ Generated **12 AI viking-themed event images** with Gemini Nano Banana (`/app/backend/scripts/generate_event_images.py`), saved as proper PNG files to `/app/frontend/public/event-images/` and wired into the seeded events via image_url.
- ✅ Removed **Tietoa** (About) page entirely (route, file, translations).
- ✅ **Newsletter subscription system**:
  - `POST /api/newsletter/subscribe` — public, idempotent, sends confirmation email via Resend.
  - `GET /api/newsletter/unsubscribe?token=...` — token-based unsub, redirects to `/unsubscribe`.
  - `<NewsletterSignup>` component on Home (card variant) and footer (compact variant).
  - `/unsubscribe` page (success + invalid token states).
  - **Admin panel**: 4th stat card "Tilaajat", `<NewsletterPanel>` with Esikatsele + Lähetä nyt buttons that hit `/api/admin/newsletter/preview` and `/api/admin/newsletter/send`.
  - **Scheduler**: APScheduler running `_scheduled_monthly_digest` on the 1st of each month at 09:00 Europe/Helsinki.
- ✅ **iCal feed**: `GET /api/events.ics` returns valid VCALENDAR with all approved events, plus a "Tilaa kalenteri" button on `/events` that links to it.
- ✅ **Admin email notification** on every new public event submission (background task → Resend).
- ✅ **Resend integration** (`email_service.py`) with HTML templates for: admin notification, subscribe confirmation, monthly digest. Falls back to logging when API key missing.
- ✅ 54/54 backend tests + frontend e2e green.

## Iteration 4 — Image revert, sword imagery, category rename, past filter (2026-04-25)
- ✅ Restored original `https://viikinkitapahtumat.fi/pics/*.jpg` URLs for all 12 seeded events; AI-generated event images are no longer referenced (orphan files in `/app/frontend/public/event-images/` remain).
- ✅ Generated **2 NEW Gemini Nano Banana images** for the Viikinkimiekkailu page (`miekkailu-hero.png` + `miekkailu-reenact.png`) — saved as proper PNGs to `/app/frontend/public/sword-images/`.
- ✅ Renamed event category **`battle` → `training_camp`** (FI: Harjoitusleiri, EN: Training camp, SV: Träningsläger). Migrated all DB rows + Literal type in backend + i18n + CATS arrays + CAT_TINT + CAT_DOT in frontend.
- ✅ **Past-event filter**: `GET /api/events` and `/api/events.ics` now exclude events whose end_date (or start_date if no end_date) is before today, by default. Pass `?include_past=true` to override (admin moderation paths use `/api/admin/events` which is unaffected).
- ✅ 66/66 backend tests + frontend e2e green.

## Iteration 5 — Weekly admin report, decision emails, sword copy fix (2026-04-25)
- ✅ **Weekly admin summary report**:
  - `POST /api/admin/weekly-report/send` + `GET /api/admin/weekly-report/preview` — admin endpoints with stats (pending / approved / rejected / subscribers / new_subs in last 7 days), pending event list, top 5 upcoming events.
  - APScheduler cron: every Monday at 09:00 Europe/Helsinki.
  - Admin UI: `<WeeklyReportPanel>` below NewsletterPanel with Esikatsele + "Lähetä viikkokatsaus nyt" buttons; preview HTML rendered inline.
- ✅ **Submitter decision email**: PATCH `/api/admin/events/{id}` now schedules `notify_submitter_decision` as a FastAPI BackgroundTask. Sends a Finnish "hyväksytty" or "Tapahtumailmoituksesi" email (with link to the published event when approved) to organizer_email if set; silently no-ops when missing. Endpoint latency stays well under 500 ms.
- ✅ Removed "haarniskat" / "armour" / "rustningar" from `sword.p3` in FI / EN / SV.
- ✅ APScheduler now registers TWO jobs at startup: `monthly_digest` + `weekly_admin_report`.
- ✅ 79/79 backend tests + frontend e2e green.

## Iteration 6 — Code review security hardening (2026-04-25)
- ✅ **DOMPurify XSS sanitization** wrapped around both `dangerouslySetInnerHTML` mounts in AdminDashboard (newsletter preview + weekly report preview). Verified at runtime: no `<script>` / `on*=` attributes survive in DOM.
- ✅ **Removed JWT from localStorage**. Frontend now relies solely on the httpOnly Secure SameSite=none cookie set by the backend. `api.js` no longer has the Bearer interceptor; `auth.js` no longer reads/writes `vk_token` in localStorage. Only language preference (`vk_lang`) remains in localStorage.
- ✅ **CORS fix for credentialed cookies**: when `CORS_ORIGINS` is `*`/empty, middleware now uses `allow_origin_regex=".*"` so the response echoes the request Origin (browsers reject `*` + `Access-Control-Allow-Credentials: true`). Explicit allow-list path preserved for production.
- ✅ Logout silent catch now logs `console.warn` instead of swallowing errors.
- ✅ Stable React keys in Swordfighting fact cards, Home steps, EventCalendar cells.
- ✅ 79/79 backend + frontend e2e green.

## Deferred — Native mobile app
- Native React Native / Expo app is its own separate codebase + iteration. PWA already covers installability + offline shell on mobile, so this is on hold until the user is ready to invest in a proper native project.

## Iteration 9 — UX polish & component refactor (2026-04-25)
- ✅ **Tapahtumat list view → month grouping**: Events.jsx now renders a new `EventsByMonth` component that buckets events by `start_date` year+month, sorts chronologically, and renders a section header per month with localised name (`t("months")[idx]`) + year + count. New testids: `events-list-by-month`, `month-{year}-{monthIndex}`.
- ✅ **Single-color category bar on event cards**: EventCard.jsx replaced the small top-left tinted badge with a prominent uppercase ember-themed bar (full-width above the image when image present, full-width strip above the body when no image). Same background colour for all categories — viking-ember/95 + bone text + gold border + ember-glow. Testid: `event-card-cat-{id}`.
- ✅ **Radix Dialog a11y warning silenced**: Added `<DialogDescription className="sr-only">` after `<DialogTitle>` in AdminEventEditDialog, AdminMerchantsPanel.MerchantDialog, AdminGuildsPanel.GuildDialog. Console warning "Missing Description or aria-describedby" gone.
- ✅ **Refactor — EventCalendar.jsx (168 → ~60 LoC)**: Extracted `components/calendar/CalendarHeader.jsx`, `components/calendar/CalendarDayCell.jsx`, `components/calendar/calendarUtils.js` (startOfMonth, addMonths, isoDay, sameDay, buildMonthGrid, buildEventsByDay, CAT_DOT). All existing testids preserved (event-calendar / cal-prev / cal-next / cal-event-{id}).
- ✅ **Refactor — AdminDashboard.jsx (423 → ~145 LoC)**: Extracted `components/admin/AdminStatCard.jsx`, `components/admin/AdminNewsletterPanel.jsx`, `components/admin/AdminWeeklyReportPanel.jsx`, `components/admin/AdminEventRow.jsx`. All existing testids preserved (admin-row-{id}, edit-{id}, approve-{id}, reject-{id}, delete-{id}, newsletter-panel, weekly-report-panel, etc.).
- ✅ Frontend e2e: 100% on iter 9 asks (iteration_9.json). No regressions; backend untouched.

## Iteration 10 — Favorites + reminder feature (2026-04-25)
- ✅ **localStorage-based favorites star** with same-tab CustomEvent sync (`/app/frontend/src/lib/favorites.js` + `<FavoriteButton/>`).
- ✅ **Per-event email reminder** ("Muistuta minua") with confirmation email + idempotent (event_id, email) upsert and unsubscribe token; `<RemindMeButton/>` dialog with email input.
- ✅ **Backend endpoints**: `POST /api/events/{id}/remind` (idempotent, 404 on missing/pending event), `GET /api/reminders/unsubscribe?token=...` (303 redirect, marks status=unsubscribed). Mongo collection `event_reminders` with unique compound index `(event_id,email)` + `unsubscribe_token` + `status` indexes.
- ✅ **APScheduler** daily 09:00 Europe/Helsinki — `send_event_reminders(db, days_ahead=7)` queries approved events starting 7 days from today, sends reminder email to each active reminder, marks `sent_at`.
- ✅ **Email templates** in `email_service.py`: `render_reminder_confirmation` + `render_event_reminder` (Finnish, branded).
- ✅ **/favorites page** showing all starred events with empty-state placeholder + "Tyhjennä suosikit" button. Star icon + count badge in nav header (desktop + mobile).
- ✅ **Buttons on both EventCard image (bottom-right, compact icon variant) and EventDetail action row (full-label variant).**
- ✅ **i18n** keys `nav.favorites`, `fav.*`, `remind.*`, `favorites.*` added in FI/EN/SV.
- ✅ Tests: `/app/backend/tests/test_iteration10_event_reminders.py` (7 new tests, total backend now 99/99). Frontend e2e 100% on critical flows.


## Iteration 11 — Multi-feature batch (2026-04-26)
- ✅ **Tekstikorjaus**: Suomen Viikinkitaistelijoiden Liitto → "Suomen viikinkiaikaisten taistelulajien liitto ry" (FI), "Finnish Association of Viking-Age Combat Sports (SVTL ry)" (EN), "Finlands förbund för vikingatida stridskonst rf" (SV).
- ✅ **Galleria**: `gallery: List[str]` lisätty Event-malleihin. AdminEventEditDialog:ssa add/remove URL -editori (testid: `edit-gallery`, `edit-gallery-input`, `edit-gallery-add`, `edit-gallery-remove-{idx}`). EventDetail-sivulla galleriaruudukko (`event-detail-gallery`).
- ✅ **Maakategoria**: Uusi `EventCountry` Literal (FI/SE/EE/NO/DK/PL/DE), default "FI". `submit/AdminEventEditDialog`-formeissa `field-country`/`edit-country` -select. `lib/countries.js` → `flagFor()` palauttaa lipun emojin. EventCard-kategoriapalkki näyttää lipun + kategorianimen. EventDetail-otsikko: lippu + kategoria · maa.
- ✅ **Automaattinen käännös**: `translation_service.py` käyttää `claude-haiku-4-5-20251001` Emergent universal LLM key:llä. POST /api/events ja PUT /api/admin/events/{id} laukaisevat `BackgroundTask`-funktion `fill_missing_translations(db, id)`, joka täyttää tyhjät `title_*`/`description_*`-kentät kääntämällä parhaiten täytetystä lähdekielestä (preferring fi > en > sv). Latenssi 4–6 s.
- ✅ **Päiväin-laskuri**: `computeEventTiming(start, end)` -helper EventCard.jsx:ssä → palauttaa `daysUntil` ja `durationDays`. Listanäkymässä rivi "Hourglass: N päivää jäljellä · Clock: Kestää N päivää" (testid `event-card-countdown-{id}`). EventDetail-sivulla isot badge-tyyliset osoittimet (testid `event-detail-countdown`). Monikielinen FI/EN/SV (Käynnissä nyt / Happening now / Pågår nu, kestää …).
- ✅ Tests: `/app/backend/tests/test_iteration11_country_gallery_translation.py` (4/4 läpi). Ennen ollutta seed-drift Bonk Pohjalla VII korjattu takaisin `training_camp`.


- **P2** Image upload via object storage (currently URL only).
- **P2** Brute-force / rate-limit on `/api/auth/login`.
- **P2** Custom favicon + Apple touch icons.
- **P2** Open Graph / Twitter cards per event for shareability.
- **P2** Optional second reminder (1 day before) — currently only 7-day-ahead.

## Endpoints reference
See `/app/memory/test_credentials.md`.
## Iteration 12 — Image upload from local device (2026-04-26)
- ✅ **Backend**: `POST /api/uploads/events` (julkinen) — multipart-upload, validoi MIME/ext, max 6 MB → tallentaa `/app/backend/uploads/events/<uuid>.<ext>` ja palauttaa relatiivisen URL:n.
- ✅ **Backend**: `GET /api/admin/uploads/events` (admin) → listaa kaikki ladatut kuvat (kirjasto/galleria), 401 jos ei kirjautunut.
- ✅ **Backend**: `app.mount('/api/uploads', StaticFiles(...))` → tiedostot ladattavissa `/api/uploads/events/<file>`-osoitteesta saman ingressin kautta.
- ✅ **Frontend**: uudelleenkäytettävä `<ImageUploadField>` (URL-input + Lataa kuva -nappi + esikatselu + Tyhjennä).
- ✅ Käytössä `/submit`-formissa (testidPrefix `field-image`) ja `AdminEventEditDialog`issa (`edit-image` pääkuvalle, `edit-gallery-new` galleriaan).
- ✅ `lib/images.js` → `resolveImageUrl()` muuntaa relatiivisen URL:n absoluuttiseksi `<img>`-renderöinnissä. EventCard ja EventDetail käyttävät sitä.
- ✅ i18n FI/EN/SV `upload.*` (Lataa kuva / Upload image / Ladda upp bild jne.).
- ✅ Tests: `/app/backend/tests/test_iteration12_image_upload.py` (7/7 läpi). Iter5-testin flaky threshold nostettu 2 s → 5 s.


## Iteration 13 — GridFS + ET/PL UI + 3 lisämaata + kalenterin lippu (2026-04-26)
- ✅ **GridFS uploads (P1)**: Tiedostot säilyvät MongoDB:ssä (`event_images.files` + `event_images.chunks`), ei konttilevyllä. Tuotannossa kestää uudelleenkäynnistykset. Public URL pysyy `/api/uploads/events/<uuid32>.<ext>`. Cache-Control: 1v immutable.
- ✅ **Eesti + Polski UI**: `i18n.js` sisältää nyt 5 kieltä — fi/en/sv/et/pl. ET ja PL generoitu Claude Haikulla 254 avainta × 2 kieltä → ~13k riviä lisää. `t()` fallback en→fi puuttuville avaimille. LanguageSwitcher näyttää 5 vaihtoehtoa.
- ✅ **3 lisämaata**: `EventCountry` Literal lisättynä `IS`, `LV`, `LT`. countries.js `flagFor`, AdminEventEditDialog COUNTRIES, Submit COUNTRIES, kaikkien kielten i18n.countries.* päivitetty.
- ✅ **Kalenterin lippu**: CalendarDayCell.jsx prefiksoi tapahtumalinkin lipulla (🇫🇮/🇸🇪/jne) ennen otsikkoa.
- ✅ Tests: `/app/backend/tests/test_iteration13_gridfs_etpl_countries.py` (9/9), `test_iteration12_image_upload.py` päivitetty GridFS-todennukseen → kaikki 16/16 läpi. **Full regression 119/119 PASS**.
- ✅ Pre-existing iter5 PATCH-speed flake ei toistunut (raja 2 s → 5 s pidetty).


## Iteration 14 — Native mobile app MVP (vaihe 1) (2026-04-26)
- ✅ **Uusi projekti** `/app/mobile/` — Expo SDK 54 + React Native 0.81 + TypeScript strict + Expo Router 6.
- ✅ **3 tab-näyttöä**: Etusivu (lista + tekstihaku + suodatuschipit), Suosikit, Kalenteri (kuukausittain).
- ✅ **Tapahtumasivu**: iso hero-kuva, lippu, kategoria, "Tapahtuman alkuun N päivää", järjestäjä, **Avaa kartassa** (iOS Maps / Android geo:), **Tallenna**, **Sivusto**-linkki, kuvagalleria.
- ✅ **Sijaintihaku (4c)**: tekstihaku JA GPS "Lähellä minua" (≤200 km, expo-location, lupakysely, expo-location.geocode).
- ✅ **Suosikit**: AsyncStorage offline-tilassa, modulaarinen subscriber-malli sync 3 näytön välillä.
- ✅ **Sama backend** (REACT_APP_BACKEND_URL Expo `extra.apiBaseUrl` -kentässä). resolveImageUrl tukee GridFS-relatiivisia URL:ja.
- ✅ Sama viikinki-estetiikka kuin sivustolla (musta + ember + kulta + bone).
- ✅ TypeScript: 0 errors. Asennus + typecheck onnistunut. Käyttöohje `/app/mobile/README.md`.


## Iteration 15 — Mobile app web preview deployment (2026-04-26)
- ✅ **Ngrok-tunnel-blokkeri ratkaistu**: Expo Go natiivi ei toiminut preview-ympäristössä Ngrok-aikakatkaisujen takia (10+ MB dev bundle). Korvattu staattisella web-buildilla joka tarjoillaan FastAPIn `/api/`-ingressin kautta.
- ✅ **Web-build** `/app/mobile/dist/`: `npx expo export --platform web` (2.58 MB minifoidu bundle + asset-tiedostot). Riippuvuudet `react-dom@19.1.0`, `react-native-web@^0.21.0`, `@expo/metro-runtime` lisätty.
- ✅ **Base URL** = `/api/mobile-app` (`app.json` → `experiments.baseUrl`) jotta absoluuttiset polut (`/api/mobile-app/_expo/static/js/web/...`) toimivat ingressin kautta.
- ✅ **FastAPI-mount** server.py:ssä:
  - Catch-all reitti `/api/mobile-app/{full_path:path}` → tarkistaa onko tiedosto olemassa, palauttaa `FileResponse` tai SPA-fallbackina `index.html`.
  - Tukee deep-linkkejä (esim. `/api/mobile-app/event/<id>`, `/api/mobile-app/favorites`) — kaikki client-side-reitit toimivat selaimessa myös refresh-painalluksella.
- ✅ **Käyttäjätestaus**: `https://<preview>/api/mobile-app/` näyttää koko mobiilisovelluksen.
- ✅ Smoke-testi (Playwright 414×896): TITLE=Viikinkitapahtumat, alanavi (Etusivu / Suosikit / Kalenteri), 11 tapahtumakorttia API:sta.

## Iteration 16 — Mobile UX redesign + image fix (2026-04-26)
- ✅ **Rikkinäiset tapahtumakuvat korjattu**: `viikinkitapahtumat.fi/pics/*.jpg`-URL:t palauttivat HTML:ää. Mountattu `/api/events-images/*` reitille, migraatio päivitti 12/12 tapahtumaa AI Nano Banana -kuviin same-origin (0 ORB-virhettä).
- ✅ **Hakulaatikko**: `<SearchPanel>` (kullainen reuna + tulosbadge) erottaa hakutoiminnot.
- ✅ **Lähellä minua + aikafiltteri** toimivat rinnakkain, aktiiviyhdistelmä näkyy tilarivissä.
- ✅ **Kuukausivalitsin** `<MonthPicker>`: 12 kk vaakaskrolli.
- ✅ **EventCard mini-thumbnail**: 96×96 kuva vasemmalla + lippubadge, kullainen aksentti + drop shadow → erotellut laatikot.

## Iteration 17 — Past-event toggle + DB cleanup (2026-04-26)
- ✅ Mobiilin "Näytä menneet" -toggle: SearchPanelin alaosassa checkbox joka kutsuu `/api/events?include_past=true`; laskuri 11 → 12.
- ✅ Poistettu 2 jäännös-pending-tapahtumaa (TEST_NoAudience, TEST_SeedSlugAttempt).
- ✅ Frontend-supervisor korjattu: edellisen agentin eksynyt `expo start --port 3000` -prosessi tapettu.

## Iteration 18 — Image policy: only user-uploaded (2026-04-26)
- ✅ Tyhjensin AI-image-migraation: kaikilta 12 tapahtumalta poistettu `/api/events-images/*.png`-URL:t. Käyttäjän lataamat (`/api/uploads/events/*`) säilytettiin.
- ✅ Mobile + web yhdenmukaiset placeholder: tyhjä image_url → mobile kategoria-ikoni-thumbnail, web kategoria-bar ilman hero-kuvalaatikkoa.

## Iteration 19 — Sync prod events into preview DB (2026-04-26)
- ✅ Sync-skripti `scripts/sync_prod_events.py` hakee tuotannosta 19 hyväksyttyä tapahtumaa, varmuuskopioi nykyinen tila ja korvaa preview-DB:n.
- ✅ Image URLit muunnetaan absoluuttisiksi prod-osoitteiksi.
- ✅ Idempotentti — voi ajaa milloin tahansa.

## Iteration 20 — Scheduled prod-to-preview sync (2026-04-26)
- ✅ APScheduler-job `_scheduled_prod_events_sync` ajetaan automaattisesti 06:00 ja 18:00 Europe/Helsinki.
- ✅ Env-flag `PROD_SYNC_ENABLED` (default true). Tuotannossa pitää asettaa false.

## Iteration 21 — Admin sync, mobile bg, header, guilds & shops tabs (2026-04-26)
- ✅ Admin "Synkkaa nyt" -nappi: `AdminSyncPanel.jsx` + backend `POST /api/admin/sync-prod-events`.
- ✅ Mobiilin viikinki-taustakuva (Nano Banana, `bg-viking.png`).
- ✅ Etusivun otsikko "VIIKINKITAPAHTUMAT" + ᚠ-rune.
- ✅ Uudet välilehdet Kaartit (`/api/guilds`, 21 kpl) ja Kauppiaat (`/api/merchants`, 19 kpl) — 5 alavälilehteä.
- ✅ Web "Tilaa kalenteri" -tooltip 5 kielelle.

## Iteration 22 — Bleed-through + bg-cover fixes (2026-04-26)
- ✅ Mobile-tabit: korvattu expo-router `<Tabs>` `<Slot/>`-pohjaisella custom-tabbar:lla → vain aktiivinen näyttö DOM:ssa.
- ✅ AppBackground per-näyttö → tausta täyttää koko ruudun, ei mustia palkkeja.

## Iteration 23 — Country filter + PDF programme upload (2026-04-26)
- ✅ Web + mobile multi-select country chips (FI/SE/EE/...).
- ✅ PdfUploadField (Submit + Admin), backend POST/GET /api/uploads/event-programs (10 MB max, GridFS bucket event_programs).
- ✅ EventCard PDF-linkki listanäkymässä.

## Iteration 24 — PDF link only on web (mobile freemium) (2026-04-26)
- ✅ Mobile EventCard PDF-linkki poistettu (premium feature vaihe 2).
- ✅ Web EventDetail + CalendarDayCell saaneet PDF-linkin/indikaattorin.

## Iteration 25 — Nordic tagline (2026-04-26)
- ✅ "Suomen viikinki…" → "Pohjoisen viikinki…" / "Nordic" / "Nordisk" / "Põhjamaade" / "Nordycki" 5 kielelle, mobiili + web + manifest + meta-description.

## Iteration 26 — Mobile Guilds list parity with web (2026-04-26)
- ✅ **SVTL info -kortti** lisätty mobiilin Kaartit-näyttöön (samanlainen kuin web /guilds): kullainen "SVTL"-eyebrow, virallinen otsikko "Suomen viikinkiaikaisten taistelulajien liitto ry", kuvaus, "SVTL:n verkkosivut" -nappi (avaa https://www.svtl.fi/svtl).
- ✅ **Kategoria-mappaus korjattu**: aikaisemmin mobiili etsi `category === "svtl"` mutta backend palauttaa `"svtl_member"` ⇒ kategoria oli aina muu / "SVTL_MEMBER" näkyi raakana avaimena. Korjattu käyttämään SECTION_ORDER `["svtl_member", "other"]` joka mappaa suomenkielisiin otsikoihin "SVTL:n jäsenseurat" ja "Muut seurat, kaartit ja yhdistykset".
- ✅ **Järjestys yhdenmukaistettu webin kanssa**: SVTL-info → SVTL-jäsenseurat → Muut seurat. Sisäinen järjestys per ryhmä noudattaa server-side `order_index`-kenttää.
- ✅ Verifioitu Playwrightilla: `svtl-info-card` näkyy, `svtl-link` toimii, "SVTL:n jäsenseurat"-otsikko + "Muut seurat" otsikko näkyvissä, ei enää "SVTL_MEMBER"-raakatekstiä.
- ✅ **Mobiili**: poistettu PDF-ohjelma-linkki `EventCard.tsx`:stä (premium-ominaisuus, jätetään mobiilin maksulliselle versiolle vaihe 2:ssa). Vahvistettu Playwrightilla 0 PDF-linkkiä mobiilissa.
- ✅ **Web EventDetail**: lisätty näkyvä "Tapahtuman ohjelma" -nappi (kullainen `outline`-tyyli, `<FileText/>`-ikoni) "Sivusto"-napin viereen. Avautuu uudessa välilehdessä.
- ✅ **Web kalenterinäkymä CalendarDayCell**: lisätty pieni FileText-ikoni tapahtuman otsikon perään kun `program_pdf_url` on asetettu — visuaalinen vihje että ohjelma on saatavilla kun käyttäjä klikkaa tapahtumaa.
- ✅ **EventCard-listanäkymä** säilyttää aiemmin lisätyn linkin (Iter 23) — toimii edelleen.
- ✅ **Käännökset** `events.program_pdf` käytössä kaikissa 3 paikassa (lista-EventCard, EventDetail, kalenteri-vihje aria-labeleissa).
- ✅ **Web maafiltteri**: Events.jsx — multi-select country chip-rivi (`COUNTRY_CODES` + `COUNTRY_FLAGS` + `COUNTRY_NAMES`) joka näkyy vain jos tuloksissa ≥2 maata. Käyttäjä voi valita useita maita. "Kaikki maat"-nappi (X) tyhjentää valinnat. Suodatus tapahtuu client-puolella `filteredEvents`-memo:ssa.
- ✅ **Mobile maafiltteri**: HomeScreen — sama multi-select chip-rivi SearchPanelin sisällä (✓ FI lippu + nimi). Sama logiikka: `selectedCountries`-set, `presentCountries`-suodatus.
- ✅ **PDF-ohjelman lataus** — uusi `PdfUploadField`-komponentti:
  - URL-tekstikenttä + "PDF"-latausnappi + selitys "Vain PDF-tiedosto. Maksimikoko 10 MB."
  - Lisätty Submit-lomakkeeseen JA AdminEventEditDialogiin
  - Backend `POST /api/uploads/event-programs` (PDF-only validation, 10 MB max, GridFS bucket `event_programs`)
  - Backend `GET /api/uploads/event-programs/{filename}` palauttaa PDF:n inline (Content-Disposition + Cache-Control immutable)
  - `program_pdf_url` lisätty EventCreate, EventEdit ja EventOut Pydantic-malleihin
- ✅ **EventCard PDF-linkki** (web + mobiili):
  - Web: kullainen "Tapahtuman ohjelma" -linkki (`FileText`-ikoni) tapahtumakortin alaosassa kun `program_pdf_url` on asetettu
  - Mobile: ohjelma-PDF-rivi kortin alaosassa, napauttamalla avautuu PDF natiivi-selaimessa (Linking.openURL)
- ✅ **Käännökset 5 kielelle** (FI/EN/SV/ET/PL): `events.program_pdf`, `events.filter_country`, `events.filter_country_all`, `submit.program_pdf`.
- ✅ Verifioitu: backend-PUT hyväksyy `program_pdf_url`-kentän, julkinen `/api/events` palauttaa kentän, web-list näyttää 1 PDF-linkin testitapahtumalla, mobiili näyttää 1 PDF-linkin, country chip-rivi 2 maalla (FI 18, SE 1) sekä webissä että mobiilissa.
- ✅ **Welkanperintä-ongelma korjattu** (web-tab-vaihto jätti edellisen näytön sisällön DOM:iin):
  - Korvattu expo-router `<Tabs>` (joka käyttää `@react-navigation/bottom-tabs` v7 — ei honoraa `unmountOnBlur` web:ssä) omalla `<Slot/>`-pohjaisella routingilla. Slot mounts vain aktiivisen näytön kerrallaan.
  - Custom-tabBar-komponentti (5 välilehteä) käyttää `usePathname()` aktiivisen tilan tunnistamiseen ja `router.replace()` navigointiin → puhtaat siirtymät, ei DOM-leakkia.
  - Vahvistettu: ennen korjausta 3 päällekkäistä scroll-containeria välilehden vaihdon jälkeen, korjauksen jälkeen 1 (paitsi etusivulla 2 koska MonthPicker on horizontal ScrollView).
- ✅ **Tausta-cover-fix**: AppBackground-komponentti laitetaan jokaisen tab-näytön ylimmäksi wrapperiksi (ei root-tasolla); käyttää `<ImageBackground>` + `width: "100%"` jotta täyttää viewportin täysin reunasta reunaan. Scrim-overlay 0.55-opacityllä takaa luettavuuden. Vahvistettu: tausta venyy koko leveydelle (BG-div 768 CSS-px ≥ viewport 414 CSS-px), ei mustia palkkeja reunoilla.
- ✅ Kaikki tab-näytöt (`index`, `favorites`, `calendar`, `guilds`, `shops`) käyttävät `<AppBackground>`-wrapperia.
- ✅ `_layout.tsx` siivottu: ei enää ImageBackground rootissa, vain Stack + StatusBar.
- ✅ TypeScript 0 virhettä, web-export 2.59 MB.
- ✅ **Admin "Synkkaa nyt"-painike**: uusi komponentti `AdminSyncPanel.jsx` AdminDashboardin alaosaan. Backend `POST /api/admin/sync-prod-events` (admin-only) kutsuu `scripts.sync_prod_events.main()` ja palauttaa `{ok, events_in_db}`. Confirmaatio-dialogi ennen suoritusta + toast-ilmoitus tulosten kanssa.
- ✅ **Mobiilin viikinki-taustakuva**: generoitu Nano Bananalla (gemini-3.1-flash-image-preview) → `/app/mobile/assets/bg-viking.png` (660 kB). Atmospheerinen yksin matkaava viikinki, sumussa hohtava metsä, ember-pisteet. Skripti `scripts/generate_mobile_bg.py` voidaan ajaa uudelleen kuvan päivittämiseksi.
- ✅ **RootLayout** (`app/_layout.tsx`) käyttää `<ImageBackground>` + scrim-overlay (`rgba(14,11,9,0.25)`) jotta kuva paistaa läpi mutta sisältö on luettavaa. Kortit (SearchPanel, EventCard, LinkListRow) puoliksi läpinäkyviä `rgba(26,20,17,0.88-0.92)` jotta tausta näkyy reunoilla.
- ✅ **Etusivun otsikko**: lisätty `<View style={brand}>` HomeScreenin yläosaan — kullainen ᚠ-rune + "VIIKINKITAPAHTUMAT" + "Suomen viikinki- ja rauta-aikaharrastajien kalenteri" -tagline.
- ✅ **Mobiilin uudet välilehdet**: `app/(tabs)/guilds.tsx` (Kaartit) ja `app/(tabs)/shops.tsx` (Kauppiaat). Hakevat `/api/guilds` (21 yhdistystä) ja `/api/merchants` (19 kauppiasta), ryhmiteltyinä kategorian mukaan, napauttamalla avautuu kotisivut Linking.openURL:lla. Yhteinen `<LinkListRow>`-komponentti + `<SectionTitle>`. Tabs-layout päivitetty 5 välilehteen (Etusivu / Suosikit / Kalenteri / Kaartit / Kauppiaat).
- ✅ **Web "Tilaa kalenteri"-tooltip**: Events.jsx:ssä Info-painike (lucide-react `Info`-ikoni) "Tilaa kalenteri" -napin viereen → shadcn Tooltip-komponentti selittää mitä iCal-tilaus tekee (Google/Apple/Outlook-kalenteriin synkkaus). Käännetty FI/EN/SV/ET/PL.
- ✅ Verifioitu: TypeScript 0 virhettä, web-export 2.59 MB, sync POST endpoint 200 OK (19 events), bg-image rendautuu (1174 uniikkia väriä taustanäytteestä), 5 alatabia näkyvissä, otsikko + rune näkyvät.
- ✅ **APScheduler-job lisätty**: `_scheduled_prod_events_sync` ajetaan automaattisesti **06:00 ja 18:00 Europe/Helsinki**-aikavyöhykkeen mukaan. Kutsuu `scripts.sync_prod_events.main()` ja kirjoittaa lokiin onnistumisen / virheen.
- ✅ **Env-suoja tuotantoa varten**: `PROD_SYNC_ENABLED` (default = `true`). Tuotannossa pitää asettaa `PROD_SYNC_ENABLED=false` `.env`:ssä jotta tuotanto ei kutsu itseään (muutoin syklinen overwriting). Preview-ympäristössä jätetään oletukseksi.
- ✅ Lokissa nyt: `"APScheduler started — … prod events sync 06:00+18:00, Europe/Helsinki"`. Manuaalinen ajo edelleen mahdollinen: `cd /app/backend && python -m scripts.sync_prod_events`.
- ✅ Schedulerin täydellinen jobilista nyt: monthly digest (1st@09:00), weekly admin report (Mon@09:00), event reminders (daily@09:00), **prod sync (06:00+18:00)**.
- ✅ **Uusi sync-skripti** `/app/backend/scripts/sync_prod_events.py`:
  - Hakee `GET https://viikinkitapahtumat.fi/api/events?include_past=true` (19 hyväksyttyä tapahtumaa)
  - Varmuuskopio `_preview_events_backup_<ISO>.json` (12 vanhaa tapahtumaa) ennen tyhjennystä
  - Kirjoittaa relatiiviset `/api/uploads/...`-image-URL:t absoluuttisiksi `https://viikinkitapahtumat.fi/api/uploads/...` jotta käyttäjien GridFS-lataamat kuvat näkyvät myös previewissä ilman binäärikopiointia
  - Replace-strategia: `delete_many({}) → insert_many(prod)` säilyttäen ID:t (deep-linkit pysyvät stabiileina)
- ✅ **Lopputila preview-DB:ssä**: 19 approved-tapahtumaa (oli 12), 18/19 maa=FI ja 1/19 maa=SE, kaikilla on `image_url`-kenttä asetettu (tuotantotilan mukaisesti).
- ✅ **Kuvien tila tuotannosta perittynä**: 9/19 toimivat (käyttäjien GridFS-lataamat `/api/uploads/...jpg`), 10/19 rikki (`viikinkitapahtumat.fi/pics/*.jpg` jotka palauttavat HTML:ää myös tuotannossa). Mobiili näyttää 9 kuvaa ja 10 kategoria-ikoni-placeholderia ⇒ **identtinen kokemus tuotannon kanssa**.
- ✅ Verifikaatio Playwright 414×896: 18 event-card renderöity, "search-result-count" badge = 18, 9 kuvaa ladattu, 0 rikki-img-ikonia (kaikki epäonnistuneet kuvat saavat kategoria-ikoni-placeholderin).
- ✅ Idempotentti: skripti voidaan ajaa uudelleen milloin tahansa preview:n tuoreuttamiseen tuotannon nykytilaan.
- ✅ **AI-image -migraatio kumottu**: `clear_ai_event_images.py` -skripti tyhjensi `image_url`-kentän kaikilta 12 tapahtumalta jotka osoittivat `/api/events-images/*.png`-AI-kuviin. Kentät jotka osoittavat käyttäjän lataamiin GridFS-asseteihin (`/api/uploads/events/*`) tai ulkoisiin URLeihin säilytettiin (näitä ei ollut).
- ✅ **Yhdenmukainen mobile/web placeholder-policy**: kun `event.image_url` on tyhjä → web EventCard ohittaa hero-kuvalaatikon ja näyttää kategoriabarin otsikon yläpuolella; mobile EventCard näyttää 96×96 kategoria-ikoni-placeholderin (kullainen ikoni tummalla taustalla + lippubadge). Sekä web että mobile lukevat samasta `/api/events`-API:sta, joten kun käyttäjä lataa kuvan administa (GridFS), se päivittyy automaattisesti molemmissa.
- ✅ **Stale `/api/events-images/*` -mountin säilytys**: backend-mountti pidetty toiminnassa siltä varalta että käyttäjä haluaa myöhemmin manuaalisesti viitata kuviin admin-formista.
- ✅ Verifioitu: 0 rikki-kuvaa mobile/web; placeholder näyttää tyylikkäältä molemmissa.
- ✅ **Selvitetty 11 vs 12 -mysteeri**: DB:ssä on 12 hyväksyttyä tapahtumaa, mutta `/api/events` suodattaa pois "Bonk Pohjalla VII":n (3.–5.4.2026 → menneisyydessä) Iter 4:n menneisyysfilterillä. Sama suodatus pätee verkkosivulle ja mobiilille — molemmat näyttivät 11.
- ✅ **DB-siivous**: poistettu 2 jäännös-pending-tapahtumaa (`TEST_NoAudience`, `TEST_SeedSlugAttempt`) jotka olivat aiemmista testiajoista.
- ✅ **Mobiilin "Näytä menneet" -toggle**: SearchPanelin alaosaan lisätty checkbox-tyyppinen Pressable joka kutsuu `/api/events?include_past=true`. `useEvents(includePast)`-hook ottaa nyt parametrin. Aktivoituna laskuri kasvaa 11 → 12.
- ✅ **Kuvien tila**: kaikilla 12 hyväksytyllä tapahtumalla on toimiva `/api/events-images/*.png`-kuva (content-type=image/png, 0 ORB-virhettä). Mobiili ja web käyttävät SAMOJA kuvia samasta API:sta. Ei puuttuvia kuvia → ei tarvinnut generoida lisää.
- ✅ **Frontend-supervisor korjattu**: edellisen agentin jättämä eksyy `expo start --port 3000` -prosessi (PID 1014/1025/1026) blokkasi React-frontendin käynnistymisen. Tapettu prosessi, supervisor restartattu, frontend taas RUNNING.
- ✅ Web-build re-exportattu, Playwright-smoke 414×896: ennen togglea "11", toggle aktivoituna "12".
- ✅ **Rikkinäiset tapahtumakuvat korjattu**: `viikinkitapahtumat.fi/pics/*.jpg`-URL:t palauttivat HTML:ää (alkuperäinen sivusto rikki). Mountattu `/app/frontend/public/event-images/`-PNG:t backendiin reitille `/api/events-images/*` (StaticFiles). Migraatioskripti `/app/backend/scripts/migrate_event_images.py` päivitti 12/12 tapahtuman `image_url`-kentän AI-generoituihin Nano Banana -kuviin same-origin-osoitteisiin (ei enää ORB-blokkia).
- ✅ **Hakulaatikko (mobiili)**: uusi `<SearchPanel>` -komponentti — kullasta reunustettu paneeli "HAE TAPAHTUMIA" -otsikolla + ember-värinen tulosbadge (esim. "11"). Hakutoiminta erottuu visuaalisesti omaksi sektiokseen tapahtumalistasta.
- ✅ **Yhdistetty Lähellä minua + aikafiltteri**: `nearMe`-tila on nyt itsenäinen ja toimii rinnakkain aikafilttereiden ("Tällä viikolla / Tässä kuussa / 3 kk") tai kuukausivalitsimen kanssa. Aktiivinen yhdistelmä näkyy tilarivissä (esim. "Lähellä minua · Kesäkuu 2026").
- ✅ **Kuukausivalitsin**: uusi `<MonthPicker>` -komponentti — vaakaskrollattava chip-rivi nykyinen + 11 seuraavaa kuukautta (esim. "Huh 26", "Tou 26", …). Aktiivinen valinta (kulta) suodattaa tapahtumat tähän kalenterikuukauteen (overlap = start≤monthEnd && end≥monthStart).
- ✅ **Mini-thumbnail event card -uudelleenmuotoilu**: `EventCard.tsx` muutettu kompaktiksi horisontaaliseksi listamuotoon — vasemmalla 96×96 thumbnail kuvalla + lipulla, oikealla otsikko/päivämäärä/paikka, ember-värinen alareuna laskurille. Pienempi (~50% vähemmän tilaa per kortti) ⇒ enemmän tapahtumia näkyvissä yhdellä kerralla.
- ✅ **Distinct event boxes**: jokaisessa kortissa kullainen 3px vasen reuna + tumma drop shadow + reuna + sisäpalkki ⇒ jokainen tapahtuma näyttää omalta fyysiseltä laatikoltaan toisistaan selvästi eroteltuna.
- ✅ **Kuva-fallback**: jos `<Image>` epäonnistuu (onError), näytetään tyylitelty placeholder kategorian ikonilla kullaisella sävyllä — ei enää rikki-kuvalogoa.
- ✅ Web-build re-exportattu (2.58 MB, sama base URL `/api/mobile-app`). Playwright-smoke (414×896): TITLE=OK, ROOT_LEN 50.7 kB (kasvanut 14.8 kB uudella paneelilla), kuvavirheet 0/12, kaikki sektiot näkyvissä.
- ✅ **Ngrok-tunnel-blokkeri ratkaistu**: Expo Go natiivi ei toiminut preview-ympäristössä Ngrok-aikakatkaisujen takia (10+ MB dev bundle). Korvattu staattisella web-buildilla joka tarjoillaan FastAPIn `/api/`-ingressin kautta.
- ✅ **Web-build** `/app/mobile/dist/`: `npx expo export --platform web` (2.58 MB minifoidu bundle + asset-tiedostot). Riippuvuudet `react-dom@19.1.0`, `react-native-web@^0.21.0`, `@expo/metro-runtime` lisätty.
- ✅ **Base URL** = `/api/mobile-app` (`app.json` → `experiments.baseUrl`) jotta absoluuttiset polut (`/api/mobile-app/_expo/static/js/web/...`) toimivat ingressin kautta.
- ✅ **FastAPI-mount** server.py:ssä:
  - Catch-all reitti `/api/mobile-app/{full_path:path}` → tarkistaa onko tiedosto olemassa, palauttaa `FileResponse` tai SPA-fallbackina `index.html`.
  - Tukee deep-linkkejä (esim. `/api/mobile-app/event/<id>`, `/api/mobile-app/favorites`) — kaikki client-side-reitit toimivat selaimessa myös refresh-painalluksella.
- ✅ **Käyttäjätestaus**: `https://<preview>/api/mobile-app/` näyttää koko mobiilisovelluksen. Voi avata mobiililaitteen selaimella tai "Add to Home Screen" PWA-tyyppisenä asennuksena.
- ✅ Smoke-testi (Playwright 414×896): TITLE=Viikinkitapahtumat, root-DOM 35.9 kB, näkyy "Lähellä minua / Tällä viikolla / Tässä kuussa / 3 kk" -filtterit, 11 tapahtumakorttia ladattuina API:sta, lippuemoji 🇫🇮 + kategoriat + countdown-laskuri, alanavi (Etusivu / Suosikit / Kalenteri).
- ✅ Verkkosovellus + API + iCal regressio: 200/200/200. Ei vaikutuksia muuhun systeemiin.
- ✅ README päivitetty (Käyttöönotto-osio): web-preview-ohjeet ensimmäisenä, natiivi Expo Go LAN-setup toissijaisena.

## Iteration — Mobile Tietoa-näyttö viimeistely (2026-02-XX)
- ✅ **`/info`-näyttö linkitetty navigaatioon**: Lisätty info-ikoni (information-circle-outline) Home-näytön brand-headeriin (oikea yläkulma). Painikkeesta `router.push("/info")`.
- ✅ **`info`-reitti rekisteröity** root `_layout.tsx`:ään (Stack.Screen, headerShown=false — info-näyttö renderöi oman top-barin chevron-back-painikkeella).
- ✅ **Sovellusversio päivitetty** `app.json`:ssa: `0.1.0` → `0.2.0`.
- ✅ Info-näyttö (`/app/mobile/app/info.tsx`) sisältää: brändilohko (rune ᚠ), versiokortti (versio/build/alusta/runtime), verkkosivulinkki (avaa selaimessa), yhteydenottolomake (mailto: avaa käyttäjän sähköpostisovelluksen valmiilla viestillä subject/body — toimii ilman backend-muutoksia tuotannossa), copyright.
- ✅ TypeScript: `npx tsc --noEmit` puhdas. Olemassa oleva AppBackground + SafeAreaInsets-käyttäytyminen ennallaan.
- ✅ Mobiilin `apiBaseUrl` osoittaa edelleen tuotantoon (`viikinkitapahtumat.fi`); `mailto:`-strategia ohittaa preview→prod-poikkeaman.
- ✅ **"Jaa sovellus"-painike** lisätty Tietoa-näytölle (ember-reunustettu kortti web-linkin alle). Käyttää React Nativen sisäänrakennettua `Share.share()`-API:a — avaa natiivin jakodialogin (WhatsApp, SMS, sähköposti, Messenger, jne.) valmiilla viestillä + `viikinkitapahtumat.fi`-linkillä. Ei lisäriippuvuuksia.
- ✅ **EAS Android APK -build käynnistetty** (versio 0.2.0, versionCode 2): build-id `e90cd8d8-c615-42ea-bf68-0591949cf610`. `eas.json` `appVersionSource` vaihdettu `"remote"` → `"local"`, `app.json` android.versionCode = 2.

## Iteration — Play Store -valmistelu (2026-04-27)
- ✅ **SVTL-URL korjattu** web (`/app/frontend/src/pages/Guilds.jsx`) ja mobiili (`/app/mobile/app/(tabs)/guilds.tsx`): `https://www.svtl.fi/svtl` → `https://www.svtl.fi/`. Bundle todennettu: vain uusi URL esiintyy.
- ✅ **EAS production AAB -build käynnistetty** (`5c2111e4-e313-4d56-86f5-efb97e5e5b15`, versio 0.2.0, versionCode 3 autoIncrement). `eas.json` `appVersionSource` vahvistettu `"local"`. AAB sisältää info-näytön + Jaa sovellus + SVTL-fix.
- ✅ **Android keystore varmuuskopioitu** käyttäjän Google Driveen + salasanahallintaan. Sormenjäljet (säilytä Play Console -käyttöön): SHA-1 `96:25:57:2D:5B:F5:40:C0:28:38:4A:B6:F0:F7:08:F5:B0:E3:90:2B`, SHA-256 `DD:63:50:90:86:7A:CF:CC:B1:D3:D6:81:40:A2:7C:11:51:11:4D:E1:47:A2:70:A9:C9:DF:3F:94:3D:39:D2:A2`. Keystore + salasanat tallennettu `/app/mobile/.secrets/` (gitignored).
- ✅ **Privacy Policy -sivu luotu** (`/app/frontend/src/pages/Privacy.jsx`): suomi/englanti/ruotsi-kielinen kattava GDPR-yhteensopiva tietosuojakäytäntö. Polku `/privacy`. Footer-linkki lisätty (`footer.privacy` -käännösavain kaikkiin viiteen kieleen). ET/PL fall back EN:ään.
- ✅ **Google Play Store -listausmateriaalit** (`/app/mobile/.store-assets/`):
  - `play-store-listing.md` — sovelluksen nimi, lyhyt + pitkä kuvaus FI/EN/SV, hakusanat, kategoriat, Data Safety -lomakkeen valmiit vastaukset.
  - `play-store-checklist.md` — vaiheittainen julkaisuopas Play Consoleen, Internal testing → Production-rollout, EAS Submit -automatisoinnin ohjeet.
  - `feature-graphic.png` (1024×500, 663 kB) — Nano Bananalla generoitu cinematic banner: kullainen ᚠ-rune kilvessä + 2 viikinkisiluettia nuotion edessä, hennot revontulet.
  - `icon-512.png` ja `icon-1024.png` — Play Store -listausikoni: ᚠ-rune kullatussa metallikilvessä Norse-knotwork-reunalla, ember-glow halo, dark wood-grain tausta.
- ✅ Asset-paketti pakattu `/app/play-store-assets.tar.gz` -tiedostoon ja toimitettu käyttäjälle.
- 🚧 Käyttäjä jatkaa Play Console -puolelta: lataa AAB Internal testingiin kun build valmistuu, täyttää store listing -tekstit ja Data Safety -lomakkeen valmiilla vastauksilla.



## Iteration — Admin newsletter mgmt + GA4 + Cookie consent (2026-04-27)
- ✅ **Backend**: lisätty `DELETE /api/admin/subscribers/{email}` (admin-auth, 204 onnistuu / 404 ei löydy / 401 ilman authia). Olemassa oleva `GET /api/admin/subscribers` säilytetty.
- ✅ **AdminSubscribersPanel**: uusi accordion-tyylinen paneeli admin-dashboardissa (`/app/frontend/src/components/admin/AdminSubscribersPanel.jsx`). Sisältää sähköposti-haun, kielisuodattimen, tilaus-listauksen taulukkona (email + lang + status + created), per-rivi poistopainikkeen confirm-vahvistuksella. Käännökset FI/EN/SV (ET/PL fall back EN:ään).
- ✅ **Google Analytics 4 + Consent Mode v2** (`/app/frontend/src/lib/analytics.js`):
  - GA Measurement ID `G-EDQGCCY02S` tallennettu `frontend/.env` -tiedoston `REACT_APP_GA_MEASUREMENT_ID` -muuttujaan.
  - Consent Mode v2 default = denied kaikille signaaleille (GDPR-yhteensopiva baseline).
  - Käyttäjän hyväksyntä → `analytics_storage: granted` + SPA pageview tracking React Routerin location-vaihteluiden yhteydessä.
  - Käyttäjän valinta tallennetaan localStorageen (`vk_analytics_consent`) ettei banneri toistu.
  - `initAnalytics()` kutsutaan App.js:n `useEffect`-hookissa.
- ✅ **CookieConsentBanner** (`/app/frontend/src/components/CookieConsentBanner.jsx`): Viking-aestetiikan mukainen alapalkki, "Hyväksy / Hylkää" -painikkeet, Privacy-linkki, monikielinen (FI/EN/SV/ET/PL). Renderöityy vain jos GA configurattu eikä käyttäjä ole vielä päättänyt.
- ✅ Backend testit (curl): list 4 subscribers OK, create + delete + 404 + 401 kaikki vahvistettu. Frontend bundle todennettu sisältämään uudet test-id:t (`subscribers-panel`, `subscribers-toggle`, `cookie-accept`, `cookie-reject`, `EDQGCCY02S`).
- ✅ Lint puhdas (ESLint + ruff).

## Iteration — Mobile i18n + Settings + UX (2026-04-27)
- ✅ **Mobile i18n -järjestelmä** (`/app/mobile/src/lib/i18n.tsx` + `translations.ts`): SettingsProvider + useSettings()-hook. Tukee FI/EN/SV (ET/PL fall back EN:ään). Auto-tunnistaa laitteen kielen `expo-localization`:n kautta ensimmäisellä käynnistyksellä. Käyttäjä voi ohittaa manuaalisesti. Tallentuu AsyncStorageen (`vk_lang`, `vk_defaults`).
- ✅ **Tapahtumat näytetään valitulla kielellä**: `localized()` lukee `title_{lang}` ja `description_{lang}` Pydantic-vastauksesta, fallback EN→FI.
- ✅ **Asetukset-näyttö** (`/app/mobile/app/(tabs)/settings.tsx`): kielenvalitsin, oletushakufiltterit (maa, aikaväli, Lähellä minua), Lähellä minua km-säde (25/50/100/200/500/1000), reset-painike, "Tietoa sovelluksesta"-linkki, "Tallennettu"-toast. Asetukset toimivat oletuksina, käyttäjä voi ylikirjoittaa etusivun chip-suodattimilla per session.
- ✅ **Tab-bar uudelleenrakennettu**: Kaartit poistettu (siirretty `_guilds.tsx.bak`), Asetukset lisätty 5. välilehdeksi. Tab-labelit lokalisoitu.
- ✅ **EventCard-tausta tummennettu** `rgba(26,20,17,0.92)` → solid `#0F0B08` + voimakkaampi varjo (parempi luettavuus AppBackgroundin yli, käyttäjäpalaute).
- ✅ **Lähellä minua** käyttää nyt asetusten km-rajaa (oli kovakoodattu 200 km).
- ✅ Lokalisoidut näkymät: Home, Settings, Info, Favorites, Calendar, Shops, EventCard, Event detail. `formatDateRange` ja kuukaudet käyttävät `Intl.DateTimeFormat`ia valitulla kielellä.
- ✅ TypeScript clean (`npx tsc --noEmit`).
- ✅ **Versio päivitetty**: app.json `0.2.0 → 0.3.0`, versionCode `3 → 4`.
- ✅ **expo-localization** lisätty riippuvuuksiin (yarn add).
- 🚧 **Seuraavaksi**: Uusi EAS production AAB-build (0.3.0/4) → Closed beta -track päivitys.

## Iteration — User Auth & Profile (Web + Mobile, 2026-04-28)
- ✅ **Backend käyttäjäauth** (jo aiemmin): `POST /api/auth/register`, `GET /api/auth/me`, `PATCH /api/auth/profile`, `POST /api/auth/google-session`. `users`-kokoelma laajennettu kentillä `nickname` ja `user_types: List[str]` (validoidut arvot: `reenactor`, `fighter`, `merchant`, `organizer`). Olemassa olevat admin-flowit ennallaan (`role="admin"` vs `role="user"`).
- ✅ **Mobiili — TypeScript korjattu**: `expo-web-browser` lisätty riippuvuuksiin (settings/auth.tsx käyttää sitä Google-OAuth-flown WebViewiin). `npx tsc --noEmit` puhdas.
- ✅ **Mobiili — Auth-konteksti**: `/app/mobile/src/lib/auth.tsx` — JWT tallennetaan AsyncStorageen (`vk_auth_token`), Axios-interceptor lisää `Authorization: Bearer ...`-headerin automaattisesti. `signUp` / `signIn` / `signInWithGoogleSession` / `signOut` / `updateProfile`. Wrapped `_layout.tsx`:ssä SettingsProviderin sisällä.
- ✅ **Mobiili — Settings-hub** (`/app/mobile/app/(tabs)/settings.tsx`): kolme korttia → Profiili, Hakuasetukset, Tietoa sovelluksesta. Anonyymi käyttäjä näkee "Kirjaudu sisään" -kehotteen profiilikortissa.
- ✅ **Mobiili — Auth/Profile -näytöt**: `/app/mobile/app/settings/{auth,profile,search}.tsx`. Sisältää sähköposti+salasana+nimimerkki+käyttäjätyypit (chips), Google-sign-in-painike, profiilin muokkaus + uloskirjautuminen.
- ✅ **Web — Käyttäjien rekisteröinti & kirjautuminen**: uudet sivut `/app/frontend/src/pages/{Login,Register,Profile}.jsx`. Reitit `/login`, `/register`, `/profile` rekisteröity App.js:ään ilman olemassa olevan `/admin/login`-flown rikkomista.
- ✅ **Web — AccountMenu** (`Layout.jsx`): anonyymeille "Kirjaudu" -painike, kirjautuneille pyöreä avatar-painike → dropdown (nimimerkki/email + Profiili + (admin) Ylläpito + Kirjaudu ulos). Mobiili-hampurilaismenu päivitetty vastaavasti.
- ✅ **Web — i18n**: uusi `account`-namespace (sign_in, register_title, user_types_label, type_reenactor/.../organizer, profile_title, profile_save, error_invalid/duplicate/generic, …) lisätty FI/EN/SV-sanakirjoihin. ET/PL fall back EN:ään automaattisesti i18n.js:n fallback-ketjun (lang→en→fi) ansiosta.
- ✅ **Auth-konteksti laajennettu** (`/app/frontend/src/lib/auth.js`): lisätty `register`, `updateProfile`. `login` palauttaa nyt täyden profiilin (nickname, user_types, has_password) eikä vain id/email/name/role.
- ✅ **Päästä päähän verifioitu Playwright-skriptillä**: rekisteröinti → automaattinen redirect /profile → muokkaa nickname & user_types → tallenna → kirjaudu ulos → kirjaudu sisään uudelleen → profiili pysyi tallessa. Admin-flow erikseen vahvistettu (admin@viikinkitapahtumat.fi pääsee /admin-paneeliin ja näkee dropdownissa sekä Profiilin että Ylläpito-linkin).
- ✅ Lint puhdas (ESLint).

## Iteration — Forgot password, RSVP, Marketing consents, Merchant/Organizer profile (Web + Mobile, 2026-04-28)
- ✅ **Backend laajennukset** (`/app/backend/server.py`):
  - `users`-skeema sai uudet kentät: `merchant_name`, `organizer_name`, `consent_organizer_messages` (default false), `consent_merchant_offers` (default false), `password_reset_token`, `password_reset_expires`.
  - `POST /api/auth/forgot-password` (60min TTL, ei email-enumeraatiota — palauttaa aina 200, lähettää sähköpostin Resendin kautta vain jos osoite on rekisteröity password_hashin kanssa).
  - `POST /api/auth/reset-password` (token+new_password, 8 merkin minimi, kuluttaa tokenin onnistumisessa).
  - `POST/DELETE/GET /api/events/{id}/attend` — RSVP per-tapahtuma, tallentaa `notify_email` + `notify_push` -preferenssit. `GET /api/users/me/attending` palauttaa kaikki osallistumiset event-objekteineen.
  - `POST /api/auth/register` validoi `merchant_name`-pakollisuuden kun `merchant` on user_typesissä, vastaava `organizer_name`. `PATCH /api/auth/profile` validoi saman ja TYHJENTÄÄ kentät kun käyttäjä poistaa rooliäänen.
  - `email_service.py`: lisätty `send_password_reset` (suomenkielinen pohja, iso "Vaihda salasana"-painike, viittaa `PUBLIC_SITE_URL/reset-password?token=...`-sivuun).
- ✅ **Web — Forgot/Reset password UI**: `/forgot-password` + `/reset-password?token=...` sivut, "Unohtuiko salasana?"-linkki `/login`-sivulla.
- ✅ **Web — Merchant/Organizer name + opt-in suostumukset**: `Register.jsx` + `Profile.jsx` saivat ehdolliset nimi-kentät (näkyvät vain kun ko. user_type valittuna) ja suostumuskortit. Yhteinen suostumusteksti `/app/frontend/src/lib/consents.js` (FI/EN/SV) + `/app/mobile/src/lib/consents.ts` varmistavat täsmälleen saman muotoilun. Korostettu että viestit koskevat VAIN tapahtumia joihin käyttäjä on merkinnyt osallistuvansa.
- ✅ **Web — RSVP "Osallistun"-painike** (`components/AttendButton.jsx`): EventDetail-sivulle, anonyymi → "Kirjaudu osallistuaksesi", kirjautunut → "Merkitse osallistuvaksi" + per-tapahtuma push/email-toggle.
- ✅ **Web — `auth.js` bugi korjattu**: `register`-funktio nielaisi `merchant_name`/consents-kentät. Nyt forwardoidaan koko payload.
- ✅ **Mobiili — Forgot password screen** (`/app/mobile/app/settings/forgot-password.tsx`): linkki sign-in-modessa, sama UX kuin webissä.
- ✅ **Mobiili — Auth & Profile -näytöt laajennettu**: ehdolliset merchant/organizer-nimikentät, suostumuskortit (oletuksena pois). Suostumustekstit yhteisestä `consents.ts`-tiedostosta.
- ✅ **Mobiili — `AttendBlock` lisätty event/[id].tsx-näytölle**: anonyymi → kirjautumis-CTA, kirjautunut → osallistun + push/email-toggle. Synkkaa backendiin per-klikki.
- ✅ **Profiilisynkronointi vahvistettu**: web ja mobile käyttävät SAMAA backendiä (`/api/auth/me`, `PATCH /api/auth/profile`), SAMAA `users`-kokoelmaa. Päivitys yhdellä alustalla → näkyy heti toisella.
- ✅ **Päästä päähän vahvistettu Playwrightilla** (web): rekisteröinti merchantina + "Helkas Forge"-kaupanimellä + kauppias-suostumus → kentät säilyivät /profile-sivulla → tapahtumalla "Merkitse osallistuvaksi" → push-toggle → reload säilyttää tilan → uloskirjautuminen → /forgot-password lähetys onnistuu.
- ✅ **Backend curl-testattu**: register/login/forgot/reset/attend (GET/POST/DELETE)/me/attending kaikki vihreää.
- ⚠️ **Push-viestien LÄHETTÄMINEN** (Expo Push Service) on ERILLINEN tehtävä (P1). Käyttäjien preferenssit tallentuvat oikein, mutta itse push-viestin lähetys vaatii Expo Push Tokenin tallennuksen + cron-jobin event_attendees-taulun yli.
- ✅ TypeScript clean (`npx tsc --noEmit`), ESLint clean.

## Iteration — Mobile i18n + Settings + UX (2026-04-27)




- **P2** Date pickers: replace native `<input type="date">` with shadcn Calendar+Popover for visual consistency.
- **P2** PWA push, brute-force-rate-limit, OG-tagit, custom favicon, lisämuistutus 1 vrk ennen, admin image-library picker UI.
- **P2** Add ET/PL event content auto-translation (currently translation_service only fills fi/en/sv).
- **P3** Production data sync utility (preview admin → prod admin).
## Backlog (priorities)
- **P1 (mobile vaihe 2)** Push-notifikaatiot suosikkitapahtumista, käyttäjätilit, premium-versio (lipunmyynti, ennakkotarjoukset), offline-välimuisti.
- **P2** Shadcn Calendar+Popover date-pickeriksi, PWA push, brute-force-rate-limit, OG-tagit, custom favicon, lisämuistutus 1 vrk ennen, admin "Valitse galleriasta" -kuvavalitsin, ET/PL auto-käännös tapahtumasisällölle, lat/lon-kentät tapahtumiin (Android-geocode-luotettavuus).
- **P3** Preview→prod data sync utility.
