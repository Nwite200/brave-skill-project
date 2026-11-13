# Security report — Brave Skills LMS upgrade

**Date:** 13 November 2026
**Scope:** authentication, authorization, payments, media entitlements, curriculum
gating, uploads, AI assistant, Android app, headers, deployment configuration.
**Status:** no production deployment performed; Cloudflare Stream not activated.

---

## 1. Findings fixed in this phase

| ID | Finding | Fix |
| --- | --- | --- |
| C1 | Hard-coded JWT fallback secret in middleware | Removed; middleware refuses to verify if `AUTH_SECRET` is missing or shorter than 32 characters |
| C2 | Demo payment possible on production if flag left on | `demoPaymentsEnabled` now requires non-production or a localhost site URL, no Paystack keys and explicit opt-in; example defaults to `false` |
| C3 | SVG uploads could execute script | SVG removed from allowed image types; only PNG/JPEG/WebP accepted |
| C4 | Module progression not enforced | Server-side progression, media, progress, quiz-start and API checks; UI locks modules |
| C5 | Video asset reuse could bypass a module lock | Media route now requires `lessonId` and verifies the asset belongs to that lesson |
| C6 | Microphone blocked by Permissions-Policy | Changed to `microphone=(self)`; voice agent now works in production |
| C7 | No CSP | Added a compatible CSP with Cloudflare Stream/YouTube/Vimeo frame sources, `object-src 'none'`, `frame-ancestors 'self'` |
| C8 | IP limits trusted any forwarded header | Cloudflare edge header used on Workers; proxy trust documented |
| C9 | Android screenshots/recording | `FLAG_SECURE` added to the Flutter activity |
| C10 | Cloudflare Stream API token exposure risk | Adapter is server-only; signed tokens; no credentials in client code |

---

## 2. Controls verified

- Passwords: bcrypt cost 12.
- Sessions: HS256 JWT, HTTP-only, SameSite=Lax, Secure in production, 7-day expiry,
  token version rotation on password change/reset.
- Role checks at middleware, page guard and API layers.
- Paystack: server-side verification, amount check, webhook HMAC timing-safe, webhook
  idempotency, idempotent fulfilment, refund revocation.
- Unpaid course isolation: tested; media without lesson context is rejected.
- Module gating: tested; locked lesson media returns 403, progress update returns 403.
- Quiz grading: server-side, randomisation mapping stored server-side, no answers sent
  before submission.
- Media: private storage/R2, HTTP Range, entitlement per lesson, student watermark.
- Rate limits: login, register, reset, checkout, coupons, contact, AI, support,
  reviews, discussions.
- Audit logs: payments, refunds, course/content changes, certificates, role changes,
  AI settings/tickets, video deletion.
- File uploads: kind, MIME, extension and size validation; path traversal blocked.
- CSV export: escaping/guard against formula injection.
- AI: private tools scoped to the session; no password/PIN/OTP requests; free Workers
  AI binding; no paid provider required.

---

## 3. Residual risks and recommendations

| Risk | Recommendation |
| --- | --- |
| No email verification at signup | Add a verification token and restrict paid actions until verified |
| No staff 2FA | Add TOTP for administrators and master administrators |
| CSP allows inline scripts (Next compatibility) | Move to nonce-based CSP during a dedicated hardening pass |
| No CAPTCHA on AI/contact | Add Cloudflare Turnstile if spam appears |
| No third-party penetration test | Commission a test against staging before launch |
| Backups not scheduled in this workspace | Configure the documented cron/GitHub Action and rehearse restore |
| Stream not live-tested | Follow `docs/VIDEO.md` after approval; do not claim live DRM until tested |
| Android purchase policy | Keep consumption-only or implement Google Play Billing with approval |
| Referral rewards | Tracking only; define reward policy before promising value |
| Certificate serial is a capability URL | Rate-limit verification; add last-name check if needed |

---

## 4. Test evidence

Executed against the production build locally:

- Registration/login and role redirects.
- Demo checkout → verified fulfilment → receipt.
- Unpaid course media rejection and module-locked media rejection.
- Module quiz start with randomised options; 50% fail and 100% pass; next module
  unlocked only after pass.
- Certificate PDF with QR and signature returned (5.1KB, valid PDF).
- Reviews, support ticket, referral link, discussion thread creation.
- Admin reviews/video/AI pages and Stream status (correctly reports not configured).
- CSP: homepage, login, course page and dashboard support page loaded with zero
  console errors.
- Android release compile with mic, biometrics and FLAG_SECURE.

Not tested live: Paystack production keys, Cloudflare Stream playback/DRM, Google
Play Billing, production Cloudflare Postgres/Hyperdrive deployment, scheduled backups.

---

## 5. Deployment gate

Do not deploy until the owner approves:

1. staging/production hosting and database,
2. Paystack live keys and webhook,
3. Cloudflare Stream account and usage costs,
4. Android signing/Play Console release,
5. backup destination and restore rehearsal.
