# API reference

Base URL: `https://academy.emyphilltech.com.ng/api`

All responses are JSON. Authenticated endpoints use the session cookie
`bs_session` (HTTP-only). The Android app forwards the cookie value from the
`Set-Cookie` header of `POST /api/auth/login`.

Errors use the shape:

```json
{ "ok": false, "error": "Human readable message" }
```

---

## Authentication

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Create a student account and start a session |
| POST | `/auth/login` | — | Sign in; returns `redirect` and sets the cookie |
| POST | `/auth/logout` | user | Clear the session |
| POST | `/auth/forgot-password` | — | Email a reset link (generic response) |
| POST | `/auth/reset-password` | — | Consume a reset token and set a new password |

Login body:

```json
{ "email": "student@braveskill.ng", "password": "BraveSkill#2026" }
```

Login response:

```json
{ "ok": true, "redirect": "/dashboard", "role": "STUDENT" }
```

Registration body:

```json
{
  "name": "Ada Nwosu",
  "email": "ada@example.com",
  "phone": "+234...",
  "password": "AtLeast8With1Number",
  "acceptTerms": true
}
```

---

## Public catalogue

| Method | Path | Description |
| --- | --- | --- |
| GET | `/courses?q=&category=&sort=` | Published courses. Sort: `newest`, `popular`, `price-asc`, `price-desc` |
| GET | `/courses/[slug]` | Course detail with curriculum (published content only) |
| POST | `/coupons/validate` | Validate a code against a course |
| GET | `/certificates/verify/[serial]` | Public certificate verification |
| GET | `/certificates/[serial]/pdf` | Download a valid certificate PDF |
| GET | `/app/download` | Latest APK (or redirect to an external build) |

Coupon validation body: `{ "code": "BRAVE20", "courseId": "..." }`

Response: `{ "ok": true, "discountKobo": 1700000, "totalKobo": 6800000, "discountLabel": "20% off" }`

`/courses/[slug]` is the mobile app's source of truth for the catalogue. The app
loads the list, then fetches detail on demand. Publishing a course in the admin
console makes it available on the next request.

---

## Payments

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/payments/initialize` | student | Create an order and return a checkout redirect |
| GET | `/payments/verify?reference=` | owner | Server-side verification with Paystack |
| POST | `/payments/demo-pay` | student | Guarded local test checkout only |
| POST | `/payments/webhook` | signature | Paystack webhook (HMAC SHA-512) |
| GET | `/payments/receipt/[orderId]` | owner/admin | Receipt PDF |

Initialise request:

```json
{ "courseId": "cm...", "couponCode": "BRAVE20" }
```

Responses:

```json
{ "ok": true, "authorizationUrl": "https://checkout.paystack.com/...", "reference": "BS-..." }
```

```json
{ "ok": true, "free": true, "redirect": "/checkout/success?reference=BS-..." }
```

Access is granted only by the server-side fulfilment function after Paystack
verification. See `docs/ARCHITECTURE.md` for the flow.

---

## Student portal

| Method | Path | Description |
| --- | --- | --- |
| GET | `/me` | Profile |
| PATCH | `/me` | Update name, phone, headline, bio |
| POST | `/me/password` | Change password (rotates sessions) |
| POST | `/me/notifications` | Mark one or all notifications read |
| POST | `/progress` | Upsert lesson completion/watch time |
| GET | `/quizzes/[id]` | Assessment metadata and attempt history |
| POST | `/quizzes/[id]/start` | Start or resume an attempt; returns questions without answers |
| POST | `/attempts/[id]/submit` | Grade answers, issue a certificate when eligible |
| GET | `/media/[assetId]` | Entitled media only; supports HTTP Range |

Progress body:

```json
{ "lessonId": "...", "completed": true, "watchedSeconds": 742 }
```

Exam submission:

```json
{ "answers": [1, 0, 2, 3] }
```

Result:

```json
{
  "ok": true,
  "score": 6,
  "maxScore": 8,
  "percent": 75,
  "passed": true,
  "passMark": 70,
  "certificateSerial": "BS-2026-4F2A9C"
}
```

Server rules:

- Final exams require every lesson to be complete.
- Attempt and time limits are enforced server-side.
- Correct answers are never returned before submission.
- Certificates are issued only after a pass and full completion.

---

## Brave AI Assistant

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/agent/bootstrap` | — | Widget identity, greeting, voice config and availability |
| POST | `/agent/chat` | optional | Conversation turn with tools and retrieval |
| POST | `/agent/tts` | — | Optional server speech (OpenAI) |
| POST | `/agent/transcribe` | — | Optional Whisper transcription fallback |
| GET/PATCH | `/admin/agent/settings` | admin | Assistant configuration |
| GET/POST | `/admin/agent/knowledge` | admin | Knowledge documents |
| PATCH/DELETE | `/admin/agent/knowledge/[id]` | admin | Update or delete a document |
| GET | `/admin/agent/tickets` | admin | Escalation queue |
| PATCH | `/admin/agent/tickets/[id]` | admin | Status, priority, assignment, note |
| GET/PATCH | `/admin/agent/conversations/[id]` | admin | Transcript and resolution |
| GET | `/admin/agent/analytics` | admin | Usage, intents and containment |

Chat body:

```json
{ "message": "How much is the solar course?", "conversationId": "cm...", "channel": "WEB" }
```

The assistant never returns private records without a session, and it never confirms
a payment unless the order is `PAID`.

---

## Reviews, discussion, support and referrals

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET/POST | `/courses/[slug]/reviews` | public / enrolled | Published reviews or submit a verified review |
| GET/POST | `/courses/[slug]/discussion` | enrolled | List or create course discussions |
| GET/POST | `/discussion/[threadId]/posts` | enrolled | Read or add replies |
| GET/POST | `/support` | student | List or create support tickets |
| GET | `/me/referral` | student | Referral code, link and signup count |

Review body: `{ "rating": 1-5, "title": "Optional", "body": "..." }`.
Support body: `{ "subject": "...", "message": "..." }`.

## Video and Stream

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/admin/stream/status` | staff | Stream configuration state |
| POST | `/admin/stream/upload-url` | staff | Resumable direct upload URL |
| POST | `/admin/stream/complete` | staff | Register/attach a Stream video |
| DELETE | `/admin/stream/[uid]` | staff | Delete a Stream video |
| GET | `/stream/[lessonId]` | student | Signed playback for an entitled lesson |
| POST | `/admin/videos/attach` | staff | Attach an existing video to a lesson |

---

## Administrator

All endpoints require `ADMIN`/`MASTER_ADMIN`; content endpoints also allow
`INSTRUCTOR` for their own courses.

| Method | Path | Description |
| --- | --- | --- |
| GET/POST | `/admin/courses` | List (own courses for instructors) / create |
| GET/PATCH/DELETE | `/admin/courses/[id]` | Read, update, publish/feature or delete |
| GET/POST | `/admin/users` | List / create staff or student accounts |
| GET/PATCH | `/admin/users/[id]` | Detail / update status, role, password |
| POST | `/admin/content/[resource]` | Create a whitelisted resource |
| PATCH/DELETE | `/admin/content/[resource]/[id]` | Update or delete |
| POST | `/admin/uploads` | Multipart upload (`file`, `kind=VIDEO\|PDF\|IMAGE\|APK`) |
| POST | `/admin/uploads/presign` | Presigned R2 PUT for large files (>70MB) |
| POST | `/admin/uploads/complete` | Register a directly uploaded R2 object as an asset |
| POST | `/admin/enrollments` | Grant course access manually |
| DELETE | `/admin/enrollments?id=` | Revoke an enrolment |
| POST | `/admin/orders/[id]/refund` | Refund and revoke access |
| POST | `/admin/certificates` | Manually issue a certificate |
| PATCH | `/admin/certificates` | Revoke/restore (`{ id, revoked, reason }`) |
| GET/PATCH | `/admin/settings` | Read/update website settings |
| PATCH/DELETE | `/admin/messages/[id]` | Update status / delete contact message |
| GET | `/admin/reports/export?type=&from=&to=` | CSV export |

Content resources: `categories`, `coupons`, `announcements`, `testimonials`,
`faqs`, `apk`, `modules`, `lessons`, `quizzes`, `questions`.

Upload response:

```json
{
  "ok": true,
  "asset": {
    "id": "cm...",
    "kind": "VIDEO",
    "name": "lesson.mp4",
    "size": 48234112,
    "url": null
  }
}
```

---

## Rate limits

| Bucket | Limit |
| --- | --- |
| Login per IP | 12 / 10 min |
| Login per email | 6 / 10 min |
| Registration | 6 / 10 min per IP |
| Password reset | 5 / 15 min |
| Checkout | 10 / 5 min per user |
| Coupon validation | 30 / 5 min per IP |
| Contact form | 6 / 15 min per IP |

Exceeding a limit returns `429` with `Retry-After`.
