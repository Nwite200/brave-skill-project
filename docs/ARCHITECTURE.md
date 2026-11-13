# Architecture

## Overview

Brave Skill is a single Next.js application that serves four surfaces from one
codebase and one PostgreSQL database:

1. **Public marketing website** — server-rendered, SEO-indexed, cached with ISR.
2. **Student portal** — authenticated, dynamic, personalised.
3. **Administrator console** — authenticated, role-aware operation tooling.
4. **JSON API** — consumed by the web client and the Flutter Android app.

```
Browser / Flutter
        │  HTTPS
        ▼
   Next.js (Node runtime)
   ├── React Server Components (public, dashboard, admin)
   ├── Route handlers /api/*   (auth, payments, learning, admin, media)
   ├── Middleware              (session + role gate)
   └── Prisma ORM
        │
        ├── PostgreSQL          (all business data)
        └── Private storage     (videos, PDFs, APK)
```

Paystack communicates with `/api/payments/webhook`; Paystack also hosts the card
checkout page. No payment details ever touch Brave Skill servers.

## Rendering strategy

| Surface | Strategy | Rationale |
| --- | --- | --- |
| Marketing pages | Server components, `revalidate = 120` on home | Fast TTFB and SEO, fresh enough when admins edit content |
| Catalogue / course detail | Dynamic (`force-dynamic`) | Prices, enrolment counts and curriculum change often |
| Dashboard / admin | Dynamic | Session-scoped, never cached |
| API | Node runtime, `no-store` | Payments and learning state must be fresh |

The public site is intentionally functional without JavaScript: content renders on
the server and the reveal animation never hides content.

## Key modules

| Path | Responsibility |
| --- | --- |
| `lib/auth.ts` | Password hashing, JWT sessions, guards (`requireUser`, `requireStaff`, `requireAdminPage`) |
| `lib/db.ts` | Prisma singleton |
| `lib/env.ts` | Typed environment access and capability flags |
| `lib/api.ts` | Route wrapper, error mapping, origin checks, rate limiting, pagination, CSV |
| `lib/payments.ts` | Coupon maths, order fulfilment (idempotent), free grants, refunds |
| `lib/paystack.ts` | Initialise, verify, refund, webhook signature, reference generation |
| `lib/storage.ts` | Private asset writes, safe paths, MIME/size validation, Range streaming |
| `lib/certificates.ts` | Certificate serials, hashes, PDF rendering, receipts |
| `lib/entitlements.ts` | Course access and lesson-level authorisation |
| `lib/admin-content.ts` | Whitelisted CRUD resources with instructor ownership rules |
| `middleware.ts` | Fast redirect gate for `/dashboard` and `/admin` |

## Data model (summary)

- **User** — role (`MASTER_ADMIN`, `ADMIN`, `INSTRUCTOR`, `STUDENT`), status, hashed password, token version.
- **Category → Course → Module → Lesson** — curriculum hierarchy with publish flags and ordering.
- **Enrollment** — unique per `(user, course)`, carries access status and price paid.
- **LessonProgress** — completion and watched seconds per enrolment/lesson.
- **Order** — payment record with reference, amount, gateway, status, refund metadata and receipt number.
- **Coupon** — percentage or fixed discount, optional course scope and usage limits.
- **Quiz → Question → QuizAttempt** — quizzes and final exams, server-graded.
- **Certificate** — serial, verification hash, issuing context, revocation.
- **Notification / Announcement** — learner communication.
- **Asset** — private media metadata; lessons reference assets, never raw paths.
- **AuditLog** — administrative and security events.
- **SiteSetting** — editable website content.
- **WebhookEvent** — provider event idempotency.
- **RateLimitBucket** — fixed-window rate limiting.

Money is stored as **integer kobo** to avoid floating point errors. All display
formatting uses `Intl.NumberFormat("en-NG")`.

## Authentication and authorisation

1. Login verifies bcrypt hash and issues a 7-day HS256 JWT containing the user id,
   role and `tokenVersion`.
2. The token is stored in an HTTP-only, `SameSite=Lax`, `Secure` (production) cookie.
3. Every request re-loads the user: suspended users and tokens with a stale
   `tokenVersion` are rejected. Password changes increment `tokenVersion`,
   invalidating all other sessions.
4. Middleware performs a cheap role check for route redirects; pages and APIs
   perform the authoritative check against the database.
5. Mutating API requests validate the `Origin` header against the host.

Permission matrix:

| Capability | Master admin | Admin | Instructor | Student |
| --- | --- | --- | --- | --- |
| Manage own courses & curriculum | ✔ | ✔ | ✔ | — |
| Publish / feature courses | ✔ | ✔ | — (submit draft) | — |
| Manage categories, coupons, announcements | ✔ | ✔ | — | — |
| View students, transactions, revenue | ✔ | ✔ | — | — |
| Refund orders, issue/revoke certificates | ✔ | ✔ | — | — |
| Change staff roles | ✔ | — | — | — |
| Learn, take assessments, earn certificates | — | — | — | ✔ |

## Payment lifecycle

```
POST /api/payments/initialize
  ├─ validates session, course, existing enrolment
  ├─ validates coupon (server-side)
  ├─ creates Order (PENDING) with unique reference + server-calculated amount
  └─ Paystack initialize → authorization_url
        │
        ▼
   Paystack checkout (card / transfer / USSD)
        │
        ├── callback → /checkout/callback → GET /api/payments/verify
        │      └─ Paystack verify API → amount check → fulfillOrder()
        │
        └── webhook charge.success → HMAC signature check → idempotency row
               └─ Paystack re-verify → fulfillOrder()
```

`fulfillOrder()` is the **only** function that grants paid access. It runs in a
database transaction, transitions the order with `updateMany(... status: PENDING)`
so retries cannot double-grant, creates or reactivates the enrolment, increments
coupon usage once, notifies the student and writes an audit entry.

Refunds call Paystack (when configured), mark the order `REFUNDED`, revoke the
enrolment and revoke any certificate, then notify the student.

## Media security

- Uploads are validated by kind (video, PDF, image, APK), MIME type, extension and size.
- Files are written under randomised storage keys inside `STORAGE_DIR`.
- `/api/media/[id]` requires a session and either staff role, a free-preview lesson,
  or an active enrolment in the lesson's course.
- Video responses support HTTP `206 Partial Content` for seeking and mobile players.
- Public images (course covers, avatars) are served only for `kind = IMAGE`.
- The APK is served from `/api/app/download` and counted per release.

For scale, replace `lib/storage.ts` with an S3-compatible driver using the same
interface; the entitlement checks remain unchanged.

## Android integration

The Flutter app consumes the same JSON API:

- `POST /api/auth/login` → session token cookie returned by the web app. The app
  reads the `Set-Cookie` value and sends it as a `Cookie` header.
- Catalogue: `GET /api/courses` (public, published only).
- Course detail: `GET /api/courses/[slug]`.
- Enrolments/progress: `/api/me/*`, `/api/progress`.
- Assessment: `/api/quizzes/[id]/start` and `/api/attempts/[id]/submit`.
- Media: `/api/media/[id]` with Range support; PDFs are opened with the platform viewer.

Because the backend is central, an administrator's publish action appears in the
app on the next catalogue load — no app update required.

## Scaling notes

- The app is stateless apart from local media; run multiple instances behind a load
  balancer after moving media to object storage.
- Enable PostgreSQL connection pooling (PgBouncer or Prisma Accelerate) for >100
  concurrent learners.
- Rate limiting is database-backed and works across instances; swap to Redis for
  high traffic.
- Reports are generated on demand; move to a queue for very large datasets.
- Add a CDN in front of `/api/media` only with signed URLs — never public buckets.
