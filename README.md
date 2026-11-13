# Brave Skill — Skill Acquisition Academy

A complete, production-oriented learning platform for **Brave Skill**, operated by
**Emyphill-Tech Global Solutions Limited**.

Learn. Practice. Build.

- **Public website** — homepage, catalogue, course detail, about, contact, FAQs, testimonials, APK download, legal pages, certificate verification.
- **Student portal** — dashboard, progress, video/PDF lessons, quizzes, timed final exams, certificates, payment history, notifications, settings.
- **Administrator console** (`/admin`) — courses, curriculum, categories, students, instructors, transactions, revenue, examinations, certificates, discount codes, announcements, website content, reports, settings, audit logs.
- **Payments** — Paystack initialise + server-side verification + signed webhook fulfilment + refunds. A guarded local test checkout is included for development.
- **Media security** — videos, PDFs and APKs live outside `public/`, streamed only after an entitlement check, with HTTP Range support.
- **Android app** — Flutter client in [`mobile/`](mobile/README.md) sharing the same API, ready to build as an APK or Android App Bundle.

---

## Stack

| Layer | Technology |
| --- | --- |
| Web | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, custom design tokens |
| Database | PostgreSQL 16 + Prisma ORM (Cloudflare Hyperdrive at the edge) |
| Auth | Role-based sessions (JWT in HTTP-only cookies), bcrypt |
| Payments | Paystack (NGN) + webhook HMAC validation |
| Documents | `pdf-lib` certificates and receipts |
| Media | Cloudflare R2 (S3 API) with authorised streaming; local filesystem fallback |
| Mobile | Flutter 3 (Android) |
| Deployment | Cloudflare Workers (OpenNext), R2, Hyperdrive, DNS |

---

## Quick start

### 1. Requirements

- Node.js 20+ (tested on Node 22)
- PostgreSQL 15+ (tested on 16)
- npm

### 2. Install

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://USER@localhost:5432/braveskill?schema=public"
AUTH_SECRET="<openssl rand -base64 48>"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### 3. Create the schema and seed demo content

```bash
createdb braveskill
npx prisma db push          # or: npx prisma migrate deploy in production
npm run db:seed             # demo academy: 5 courses, students, orders, certificates
```

The seed copies short demo videos from `storage/seed/` into private storage and
generates branded PDF field guides. Re-run it any time to reset demo data.

### 4. Run

```bash
npm run dev      # http://localhost:3000
# or
npm run build && npm start
```

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Master administrator | `master@braveskill.ng` | `BraveSkill#2026` |
| Administrator | `admin@braveskill.ng` | `BraveSkill#2026` |
| Instructor | `instructor@braveskill.ng` | `BraveSkill#2026` |
| Student | `student@braveskill.ng` | `BraveSkill#2026` |

> Change or remove these accounts before going live. The administrator console is at
> **`/admin`**.

---

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | 32+ byte secret for signing sessions (rotating it signs everyone out) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, used in emails, webhooks and certificates |
| `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` | Paystack API keys |
| `ALLOW_DEMO_PAYMENTS` | Local test checkout. **Must be `false` in production.** |
| `STORAGE_DIR` | Private media directory (default `./storage`) |
| `SMTP_*` | Transactional email; falls back to console logging when unset |
| `BACKUP_DIR` | Database backup destination |
| `ADMIN_ALERT_EMAILS` | Optional comma-separated alert recipients |

Full reference: [`.env.example`](.env.example).

Primary deployment: **Cloudflare** — see [`docs/CLOUDFLARE.md`](docs/CLOUDFLARE.md).
Node/VPS fallback: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Prisma generate + production build |
| `npm start` | Start the production server |
| `npm run typecheck` | TypeScript validation |
| `npm run db:push` | Sync schema without a migration (development) |
| `npm run db:migrate` | Create a development migration |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed demo academy data |
| `npm run db:reset` | Reset schema and re-seed (destructive) |
| `npm run db:backup` | Compressed PostgreSQL backup with retention |
| `npm run db:restore -- <file>` | Restore a backup (asks for confirmation) |
| `npm run cf:build` | Build the OpenNext Cloudflare Worker |
| `npm run cf:preview` | Preview the Worker locally (Wrangler) |
| `npm run cf:deploy` | Deploy to Cloudflare Workers |
| `npm run intro:render` | Render the cinematic brand film from the deterministic canvas |
| `npm run brand:assets` | Regenerate PNG logos, icons, OG and Play assets |
| `npm run qa:screens` | Desktop/mobile screenshots of key screens (Puppeteer) |
| `npm run qa:flows` | End-to-end purchase, learning, quiz and admin flows |

QA scripts expect a running server at `http://localhost:3000` and Chrome installed.

---

## Project structure

```
app/
  (site)/            public marketing pages + checkout
  (auth)/            login, register, password reset
  dashboard/         student learning portal
  admin/             administrator console
  api/               REST API (auth, payments, learning, admin, media)
components/
  brand/             logo system + animated intro
  marketing/         homepage sections
  learning/          lesson player
  admin/             console components
  ui/                shared primitives
lib/                 auth, payments, storage, certificates, validation
prisma/              schema, seed, migrations
mobile/              Flutter Android application
storage/             private media (gitignored)
scripts/             backups, brand assets, QA
docs/                deployment, admin, API, Android, security
```

---

## Security highlights

- Passwords hashed with bcrypt (cost 12); sessions signed with HS256 and rotated per user.
- Role-based authorisation enforced in middleware, page guards and every API handler.
- Paid access granted **only** by the server after Paystack verification or a verified webhook.
- Webhook signatures validated with timing-safe HMAC comparison and replay protection.
- Rate limits on login, registration, password reset, coupons, checkout and contact.
- Private media: no direct filesystem paths are exposed; Range requests supported.
- Audit log for payments, refunds, content changes, role changes, certificates and exports.
- CSV injection mitigated in report exports; origin checks on mutating requests.

See [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Cloudflare deployment](docs/CLOUDFLARE.md)
- [Cinematic brand intro](docs/BRAND-INTRO.md)
- [Deployment (Node/VPS fallback)](docs/DEPLOYMENT.md)
- [Administrator guide](docs/ADMIN-GUIDE.md)
- [API reference](docs/API.md)
- [Android build & Play Store](docs/ANDROID.md)
- [Google Play listing pack](docs/PLAY-STORE.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Ownership & handover](docs/OWNERSHIP.md)

---

## Ownership

Brave Skill, its source code, brand assets, database and deployments are owned by
**Emyphill-Tech Global Solutions Limited**. See [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md)
for the full asset and credentials checklist.

© Emyphill-Tech Global Solutions Limited. All rights reserved.
