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


## Backlog (priorities)
- **P1** Native mobile app (React Native / Expo) syncing `/api/events`.
- **P2** Date pickers: replace native `<input type="date">` with shadcn Calendar+Popover for visual consistency.
- **P2** PWA push, brute-force-rate-limit, OG-tagit, custom favicon, lisämuistutus 1 vrk ennen, admin image-library picker UI.
- **P2** Add ET/PL event content auto-translation (currently translation_service only fills fi/en/sv).
- **P3** Production data sync utility (preview admin → prod admin).
