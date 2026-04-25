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

## Backlog (priorities)
- **P1** Native mobile app (React Native / Expo) syncing the same `/api/events` endpoints.
- **P1** Curated content for Courses/Guilds/Shops pages (currently a small placeholder list for Guilds/Shops).
- **P1** Email notification to admin when a new submission arrives (e.g. SendGrid/Resend).
- **P1** iCal feed (`/api/events.ics`) so visitors can subscribe in their own calendar app.
- **P2** Image upload via object storage (currently URL only).
- **P2** Brute-force / rate-limit on `/api/auth/login`.
- **P2** Validate `?status=` enum on `/api/admin/events`.
- **P2** Admin: edit event details (currently approve/reject only).
- **P2** Custom favicon + Apple touch icons.
- **P2** Open Graph / Twitter cards per event for shareability.

## Endpoints reference
See `/app/memory/test_credentials.md`.
