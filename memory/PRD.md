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
