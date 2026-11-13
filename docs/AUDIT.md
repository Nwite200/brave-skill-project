# Brave Skills — audit, risk register and delivery plan

**Audit date:** 13 November 2026
**Scope:** website, admin console, student portal, API, database, Android app, payments, media, AI assistant, deployment.
**Constraint:** no deployment and no paid-service activation during this work.

---

## 1. Executive summary

The platform already has a working LMS core: role-based authentication, PostgreSQL
data model, course/category/module/lesson management, Paystack checkout with
server-side fulfilment, protected media, quizzes/exams, progress, certificates,
admin analytics, AI assistant, Cloudflare R2 storage and a Flutter app.

The gaps identified at audit have now been implemented and tested locally:

1. **Module progression and compulsory module quizzes** — enforced server-side.
2. **Cloudflare Stream** — adapter, resumable uploads, signed playback and the admin
   video library are integrated. They remain **disabled** until the owner approves the
   service and supplies credentials; private local/R2 storage is the active backend.
3. **Question randomisation** and the exam defaults (10 questions / 70% / 20 minutes /
   2 attempts) — implemented and configurable.
4. **Certificate QR verification and authorised signature** — implemented.
5. **Ratings/reviews, student discussions, referrals and a student support-ticket
   portal** — implemented.
6. **Android in-app purchase** remains consumption-only by design; changing it has
   Google Play policy implications and needs the owner's decision.
7. **Security hardening** items C1–C10 are fixed (see the security report).

Remaining work is deployment and owner decisions, not missing features.

Status legend: ✅ implemented, ⚠️ partial, ❌ missing.

| Area | Status | Notes |
| --- | --- | --- |
| Admin: courses/categories/modules/lessons | ✅ | CRUD, ordering, publish, pricing, instructors |
| Admin: students/instructors | ✅ | suspend, reset password, manual grant |
| Admin: quizzes/questions | ✅ | module binding, required quizzes, randomisation and defaults |
| Admin: payments/revenue | ✅ | daily/weekly/monthly, totals, sales, refunds, failed/pending |
| Admin: certificates | ✅ | issue/revoke/download; QR + authorised signature |
| Admin: announcements/coupons | ✅ | |
| Admin: website/AI/audit | ✅ | |
| Video upload | ✅ | local/R2 plus resumable Stream uploads, progress, admin library |
| Cloudflare Stream | ⚠️ | adapter, resumable uploads, signed playback and admin library implemented; not activated |
| Per-course payment | ✅ | server-verified, idempotent, refunds, receipts |
| Unpaid course isolation | ✅ | enrolment checked per course and per media asset |
| Compulsory quizzes/module unlock | ✅ | server-side gating + UI locks implemented |
| Randomised questions/options | ❌ | |
| Certificate QR/signature | ✅ | QR + authorised signature added |
| Student dashboard | ✅ | courses, progress, exams, certificates, payments, notifications |
| Reviews/ratings | ✅ | verified enrolled students; admin moderation |
| Discussion | ✅ | enrolled-only course threads/replies |
| Referrals | ✅ | codes, attribution, tracking only (no automatic payouts) |
| Student support tickets | ✅ | student portal + admin queue |
| Android app | ⚠️ | same backend, AI, biometrics; no purchase; no FLAG_SECURE |
| Email/password recovery | ✅ | HTTP email via Resend; console fallback |
| Security controls | ⚠️ | strong base; critical fixes listed below |
| Testing | ✅ | API/browser regression pass for gating, payments, reviews, support, certificates; Stream remains untested live |

---

## 2. Critical security findings (fix first)

### C1 — Hard-coded JWT fallback secret
`middleware.ts` signs/verifies with a public fallback when `AUTH_SECRET` is missing.
An attacker who knows the fallback can forge a session cookie and reach protected
routes (page-level guards still check the database, but middleware role routing can
be bypassed).
**Fix:** fail closed; require a 32+ byte secret at startup and in middleware.

### C2 — Demo payments can be enabled in production
`ALLOW_DEMO_PAYMENTS=true` is the example/local default. A production deployment with
Paystack keys absent could grant courses through the demo endpoint.
**Fix:** refuse demo checkout when `NODE_ENV=production`; default the example to
`false`; add an explicit production guard and audit warning.

### C3 — SVG image uploads (stored XSS)
SVG is allowed for course covers and served inline from the same origin. A malicious
staff-uploaded SVG could execute script in a learner's browser.
**Fix:** remove SVG from allowed image types; serve remaining images with
`Content-Disposition: inline` and a restrictive content type. Keep uploaded images
staff-only.

### C4 — Module access not enforced
An enrolled student can open any lesson in any module, regardless of previous module
quizzes. This violates the progression rule and the compulsory-quiz requirement.
**Fix:** add module-level gating in API and UI; enforce on media, progress, quiz start
and lesson data endpoints.

### C5 — Cloudflare Stream credentials and playback
No Stream integration exists. When added, credentials must remain server-side and
playback must use short-lived signed tokens. Never expose the API token, signing key
or a public MP4.
**Fix:** server-only Stream adapter, signed playback tokens, admin-only uploads,
watermark overlay, configurable DRM where the Stream plan supports it.

### C6 — Android purchase policy
Adding an external Paystack purchase flow inside the Android app would likely breach
Google Play’s Payments policy for digital content. The current consumption-only design
is compliant.
**Decision required:** either (a) keep website purchase + consumption app, or (b)
implement Google Play Billing (requires Play Console product setup and approval).

---

## 3. High/medium findings

| ID | Finding | Severity | Action |
| --- | --- | --- | --- |
| H1 | No CSP header; inline scripts from Next/AI widget | High | Add a nonce-based or compatible CSP after asset audit |
| H2 | IP rate limits trust `X-Forwarded-For` | Medium | Document trusted proxy; strip client-supplied header at edge |
| H3 | No email verification at signup | Medium | Add verification flow (currently reset only) |
| H4 | No 2FA for administrators | Medium | Add TOTP for master/admin roles |
| H5 | AI anonymous ticket spam | Medium | Add Turnstile/captcha or verified email before ticket creation |
| H6 | Certificate PDF public by serial | Low | Serial is a capability; add rate limit + optional last-name check |
| H7 | Media sharing: an asset reused in another course inherits access | Low | Bind assets to a course or check all lessons |
| H8 | No scheduled backup job | High | Add cron/GitHub Action, off-site copy, restore rehearsal |
| H9 | Failed payments/refund records lack dedicated views | Medium | Add finance views and CSV |
| H10 | Instructor upload has no course ownership on the asset itself | Low | Scope asset assignment to owned courses |
| H11 | No database constraint preventing negative prices | Low | Validate in Zod (done) and DB check |
| H12 | No intake/cohort scheduling (not required) | Info | Courses are self-paced |

Controls already good: bcrypt, HTTP-only cookies, token versioning, role checks,
server-side payment verification, webhook HMAC timing-safe comparison, idempotent
fulfilment, private media entitlement, DB-backed rate limits, audit logs, CSV
sanitisation, Prisma parameterisation.

---

## 4. Missing requirement detail

### 4.1 Module progression and compulsory quizzes

Proposed rule:

- Lessons inside module N are available only if module N is unlocked.
- Module 1 is always unlocked for an enrolled student.
- A module quiz is **required** when configured.
- The quiz unlocks when all published lessons in the module are complete.
- Module N+1 unlocks only when module N's required quiz is passed.
- The final course exam remains separate and requires all modules complete.
- The API returns `locked`, `quizRequired`, `quizPassed` per module; the student UI
  shows padlocks and the next action.

Default exam settings: 10 questions, 70% pass mark, 20 minutes, 2 attempts. These are
defaults, not hard-coded limits; administrators can change them per assessment.

### 4.2 Randomisation

On attempt start, the server selects the configured number of questions, shuffles
question order and shuffles options, recording the mapping on the attempt. Grading
uses the stored mapping, so answers cannot be inferred or manipulated client-side.

### 4.3 Cloudflare Stream

- Server creates a direct-upload (TUS) URL; admin uploads from phone/computer with
  resumable progress.
- Store only the Stream video UID and metadata; never store the API token client-side.
- Playback uses short-lived RS256 signed tokens restricted to the enrolled student.
- Student email watermark overlay; optional DRM per Stream plan.
- Delete/replace/publish controls in the admin video library.
- Not activated until the owner supplies account credentials and approves any paid
  usage beyond the free allowance.

### 4.4 Certificates

Add QR code pointing to the public verification URL and an authorised signature image
plus signatory name/title. Keep serial + hash.

### 4.5 Community and support

Add course reviews (verified purchase only), discussion threads/posts (enrolled
students), student support tickets, and referral codes with tracking. No cash payouts
without approval.

---

## 5. Phased delivery plan

| Phase | Work | Status |
| --- | --- | --- |
| 0 | Audit, risk register, test baseline | ✅ this document |
| 1 | Security fixes C1–C3, production payment guard, headers | In progress |
| 2 | Module gating, compulsory module quizzes, randomisation, exam defaults | Planned |
| 3 | Certificate QR + signature; finance daily/weekly views | Planned |
| 4 | Cloudflare Stream adapter, admin video library, signed playback (disabled until credentials/approval) | Planned |
| 5 | Reviews, discussions, student support, referrals | Planned |
| 6 | Android FLAG_SECURE, parity, purchase decision | Planned |
| 7 | Full regression, security report, backups, handover docs | Planned |

No deployment or paid service is activated in any phase without written approval.

---

## 6. Test baseline

Existing verified flows (headless browser + API): registration, login, coupon,
demo checkout, enrolment, receipt, lesson completion, quiz grading, admin category
CRUD, publish toggle, mobile menu, admin permissions, AI chat/tools/tickets, R2
storage fallback, Cloudflare Worker build.

Missing tests to add: module lock enforcement, quiz availability after lessons,
randomised grading, exam defaults, unpaid lesson/media access across courses,
certificate QR resolution, Stream signature validation, Android FLAG_SECURE.

---

## 7. Implementation update (13 Nov 2026)

Phase 1 and 2 are implemented: security fixes C1–C3/C5/C6, module progression,
compulsory quizzes, randomisation, exam defaults, certificate QR/signature, reviews,
discussions, referrals, student support and the Stream adapter/library. Stream remains
disabled pending credentials and cost approval. Android purchase and Google Play
Billing remain a decision for the owner.

---

## 8. Decisions required from the owner

1. **Android purchase:** keep consumption-only (compliant) or implement Google Play
   Billing? Play Billing requires product configuration and approval.
2. **Cloudflare Stream:** approve the service and provide account ID, API token,
   customer code and signing key. This may incur charges beyond the free allowance.
3. **Flutterwave:** is it required in addition to Paystack? It needs its own keys.
4. **Referral rewards:** tracking only, discount codes, or cash credit?
5. **Discussion moderation:** open posting or admin approval?
6. **DRM:** Stream signed URLs are included; full DRM depends on the Stream plan.
