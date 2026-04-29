# Viikinkitapahtumat 🛡️

> Pohjoismaiden viikinki- ja rautakauden harrastajien tapahtumakalenteri.
> A Nordic event calendar for Viking & Iron Age reenactors, historians and
> enthusiasts — covering festivals, markets, fighter training, courses and
> crafts across Finland, Sweden, Denmark, Norway, Estonia, Poland and more.

🌐 **Live site:** [viikinkitapahtumat.fi](https://viikinkitapahtumat.fi)
📱 **Android app:** Google Play (closed testing — ask to join)
🗓️ **Events:** 100+ verified across 21 countries

---

## ✨ Features

- 📆 **Multilingual event calendar** in Finnish, English, Swedish, Danish,
  German, Estonian and Polish. Per-user language preference that never leaks
  between accounts.
- 🔍 **Smart search & filters** by country, date range, category (fighter,
  merchant, reenactor, organizer), GPS-distance ("Near me"), and free text.
- 📝 **User accounts** with detailed profiles: association, nickname, event
  categories, profile photo, and PDF document uploads (Fighter Card,
  Equipment Passport).
- 🎟️ **RSVP tracking** — mark attendance, get reminders by email and/or push
  notification.
- 💬 **Paid merchant/organizer messaging** — verified merchants & event
  organizers can message event attendees who opted in (with per-event quota
  preventing spam; configurable by admins).
- 🔔 **Expo Push Notifications** (Android FCM V1) — event reminders and
  organizer announcements.
- 🗺️ **"Open in Maps"** — one-tap directions to any event.
- 📧 **Email reminders** via Resend with iCal (.ics) attachments.
- 🤖 **Automatic AI translations** of event descriptions via Anthropic
  Claude Haiku 4.5 (runs nightly for any event with missing locale content).
- 🎨 **Norse / Viking aesthetic** — carved card UI, brand gold accents,
  parchment textures, serif runic typography.
- 🔐 **JWT-based custom authentication** — login, logout, password change,
  password reset via emailed token.
- 📲 **PWA** (installable web app) + native React Native / Expo mobile app
  sharing the same backend.
- 📈 **SEO** — dynamic per-event OG tags, canonical sitemap.xml streamed
  from the backend, robots.txt, Google Search Console verification.
- 🛡️ **GDPR-ready** — cookie consent, data export, account self-deletion,
  documented Play Console Data Safety mapping.

---

## 🏗️ Architecture

```
┌───────────────────────────┐          ┌───────────────────────────┐
│   React + Tailwind CSS    │          │  Expo (React Native) +    │
│     (viikinkitapahtumat.fi) │   API   │  Expo Router              │
│   PWA, SEO, Admin panel   │ ──────▶  │  Android / iOS app        │
└───────────────────────────┘          └───────────────────────────┘
                │                                    │
                ▼                                    ▼
        ┌─────────────────────────────────────────────────┐
        │          FastAPI (Python 3.11)                  │
        │  JWT auth · GridFS uploads · APScheduler        │
        │  Resend (email) · Expo Push (FCM V1) ·          │
        │  Claude Haiku 4.5 (translations via Emergent    │
        │  LLM Key)                                       │
        └─────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   MongoDB    │
                    │  (Motor)     │
                    └──────────────┘
```

### Tech stack

**Backend** (`/backend`)
- [FastAPI](https://fastapi.tiangolo.com/) · Python 3.11
- [Motor](https://motor.readthedocs.io/) (async MongoDB driver)
- [APScheduler](https://apscheduler.readthedocs.io/) (background translation sweeps, email reminders)
- [Pydantic v2](https://docs.pydantic.dev/) · [Resend](https://resend.com/) · [Expo Server SDK](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Emergent LLM Key](https://github.com/emergent-labs/emergentintegrations) for Claude Haiku 4.5 translations and Gemini Nano Banana image generation

**Frontend** (`/frontend`)
- React 18 + React Router 7
- Tailwind CSS + [Shadcn/UI](https://ui.shadcn.com/) component library
- React Helmet (per-route SEO) · Sonner (toasts)
- Axios (HTTP) · date-fns · Lucide icons

**Mobile** (`/mobile`)
- Expo SDK 54 · Expo Router (file-based routing)
- React Native 0.82 · TypeScript
- AsyncStorage · Expo Location · Expo Notifications (FCM V1)
- EAS Build for production AAB

**Database**
- MongoDB collections: `users`, `events`, `event_attendees`, `message_log`,
  `system_config`, `newsletter_subscribers`, `email_reminders`.
- GridFS for user-uploaded profile images and PDF documents.

---

## 🚀 Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+ and Yarn
- MongoDB running locally (or a connection URL)
- Expo CLI for mobile: `npm install -g eas-cli`

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/viikinkitapahtumat.git
cd viikinkitapahtumat

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install

# Mobile
cd ../mobile
yarn install
```

### 2. Configure environment variables

Create `/backend/.env`:
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=viikinkitapahtumat
CORS_ORIGINS=http://localhost:3000
EMERGENT_LLM_KEY=<your-key-from-emergent-dashboard>
RESEND_API_KEY=<your-resend-api-key>
JWT_SECRET=<random-32-char-hex-string>
PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAIL=admin@yourdomain.test
ADMIN_PASSWORD=<bootstrap-admin-password>
```

Create `/frontend/.env`:
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

Create `/mobile/.env`:
```bash
EXPO_PUBLIC_API_URL=http://localhost:8001
```

> ⚠️ **Never commit `.env` files.** They are gitignored by default.

### 3. Run

```bash
# Terminal 1 — Backend
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 — Frontend
cd frontend && yarn start

# Terminal 3 — Mobile (Expo Dev Server)
cd mobile && yarn start
```

- Web: http://localhost:3000
- Backend API docs: http://localhost:8001/docs
- Mobile: scan QR with Expo Go app on your phone

### 4. Seed initial data

Visit `http://localhost:8001/api/admin/seed-events` (admin-only) to populate
sample Viking events for testing.

---

## 📱 Mobile Build (Android AAB)

Production builds run on EAS Build:

```bash
cd mobile
EXPO_TOKEN=<your-token> eas build --profile production --platform android
```

FCM (Firebase Cloud Messaging) push notifications require:
1. `google-services.json` from Firebase Console (see `docs/FCM_SETUP_GUIDE.md`)
2. FCM V1 service account JSON uploaded to EAS Credentials
3. Uploaded as EAS File Environment Variable `GOOGLE_SERVICES_JSON` (secret visibility)

Full step-by-step guide: [`docs/FCM_SETUP_GUIDE.md`](docs/FCM_SETUP_GUIDE.md)

---

## 🧪 Tests

```bash
export TEST_ADMIN_PASSWORD=<your-admin-password>
cd backend && pytest tests/
```

> The `TEST_ADMIN_PASSWORD` environment variable is required — no password is
> ever hardcoded in the codebase. See [Security](#-security) below.

---

## 📚 Documentation

- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — End-user guide (Finnish)
- [`docs/FCM_SETUP_GUIDE.md`](docs/FCM_SETUP_GUIDE.md) — Firebase / push setup
- [`docs/PLAY_CONSOLE_DATA_SAFETY.md`](docs/PLAY_CONSOLE_DATA_SAFETY.md) — Play Store data safety mapping

---

## 🔐 Security

- **No hardcoded credentials.** All secrets come from `.env` files (gitignored) or EAS Environment Variables.
- **JWT authentication** with bcrypt-hashed passwords (cost factor 12).
- **HTTP-only, Secure, SameSite=none cookies** for session tokens.
- **CORS** restricted to configured `CORS_ORIGINS`.
- **GDPR**: user data export and account deletion endpoints.
- **Message quota** prevents merchant/organizer spam (configurable, default 10/event, not reset by RSVP cycling).

### Reporting a vulnerability

Please email admin@viikinkitapahtumat.fi with the details; we will respond within 72 hours. Do not open public GitHub issues for security bugs.

---

## 🤝 Contributing

Contributions are welcome! Viking reenactment is a global community — if you
spot missing events, translation improvements, or bugs, open an issue or PR.

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-improvement`
3. Commit your changes with a descriptive message
4. Push and open a pull request

---

## 📜 License

Copyright © 2025–2026 Sami Viljanen / Viikinkitapahtumat.fi

This project is provided **for educational and non-commercial reference use**.
Contact admin@viikinkitapahtumat.fi if you want to reuse substantial portions
commercially.

---

## 🙏 Acknowledgements

- Built with 🤖 [Emergent](https://emergent.sh) — the AI-native full-stack platform
- Nordic reenactment community for inspiration and event data
- Anthropic Claude Haiku 4.5 for AI translations
- Firebase / Expo for cross-platform push infrastructure

---

*Bi öllum véum heilir!* — Be hale in all sanctuaries.
