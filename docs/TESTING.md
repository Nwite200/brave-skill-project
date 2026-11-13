# Testing

## Test environment

- Web: Next.js 15.5.9 (production build), Node 22, PostgreSQL 16
- Browser automation: headless Chrome via Puppeteer
- Mobile: Flutter Android (see `docs/ANDROID.md`)

Demo accounts (password `BraveSkill#2026`):

| Role | Email |
| --- | --- |
| Master administrator | `master@braveskill.ng` |
| Administrator | `admin@braveskill.ng` |
| Instructor | `instructor@braveskill.ng` |
| Student | `student@braveskill.ng` |

---

## Automated coverage

### API smoke tests (curl)

| Area | Checks | Result |
| --- | --- | --- |
| Auth | Login student/admin/instructor, wrong password rejection, logout, register | Pass |
| Session | `/api/me`, dashboard/admin access, role redirects | Pass |
| Catalogue | Published listing, course detail, admin-created course visible | Pass |
| Coupons | Valid percentage code, server-computed total | Pass |
| Checkout | Initialise order, demo payment, verify, enrolment created | Pass |
| Receipts | PDF generation and download | Pass |
| Certificates | PDF download, public verification JSON, revocation | Pass |
| Media | Video streaming, HTTP Range 206, anonymous access denied | Pass |
| Assessments | Start attempt, server grading, review payload | Pass |
| Admin content | Create module/lesson, create announcement, instructor ownership | Pass |
| Admin permissions | Instructor blocked from admin-only pages/endpoints | Pass |
| Reports | CSV generation for each report type | Pass |

### Browser E2E (`npm run qa:flows`)

1. Register a new student through the UI.
2. Open a paid course and apply `BRAVE20` (price drops to ₦68,000).
3. Enrol and complete the test checkout.
4. Start learning from the success page.
5. Mark a lesson complete (progress persisted).
6. Start, answer and submit a quiz; server returns a graded result.
7. Sign in as administrator, create a category, see it in the table, delete it.
8. Toggle a course's publication state.
9. Open the mobile menu at 390px.

### Visual QA (`npm run qa:screens`)

Screenshots are produced for desktop and mobile views of the homepage, catalogue,
course detail, about, FAQs, download, login, registration, verification, dashboard,
my courses, learning player, assessments, certificates, payments, notifications,
settings, and the main administrator screens. Output: `qa-shots/`.

---

## Manual test matrix

### Public website

- [x] Homepage renders all sections, hero CTAs work, intro animation is skippable.
- [x] Reduced-motion preference disables animation.
- [x] Course search, category filter and sorting.
- [x] Course detail: curriculum accordions, preview labels, outcomes, requirements.
- [x] Coupon apply success and error states.
- [x] Mobile navigation and responsive layout at 390px / 768px / 1440px.
- [x] Certificate verification with a valid and an invalid serial.
- [x] Legal pages, FAQ accordion, contact form validation.
- [x] Download page QR code encodes the APK route.

### Student

- [x] Registration with validation and terms acceptance.
- [x] Login/logout, password reset request.
- [x] Dashboard continues the most progressed course.
- [x] Video playback with seeking, PDF viewing and download.
- [x] Mark complete, progress percentages and completion counts.
- [x] Quiz start, navigation, submission, answer review.
- [x] Final exam locked until all lessons complete.
- [x] Certificate list and PDF download.
- [x] Payment history with receipt download.
- [x] Notifications read state.
- [x] Profile update and password change.

### Administrator

- [x] Dashboard metrics, revenue chart, recent activity.
- [x] Category create/edit/delete.
- [x] Course create/edit, publish/feature toggles.
- [x] Curriculum builder: module create/edit, lesson create with video URL/text.
- [x] File upload (image/PDF/video) and entitlement enforcement.
- [x] Assessment creation and question editor.
- [x] Student search, manual grant, password reset, suspend/activate.
- [x] Instructor creation and restricted navigation.
- [x] Transaction list, refund flow and revocation.
- [x] Certificate manual issue, revoke and restore.
- [x] Coupon create and enforce.
- [x] Announcement creation (notifications generated).
- [x] Website settings, testimonials, FAQs, APK manager, contact inbox.
- [x] CSV exports.
- [x] Audit log entries for administrative actions.

### Payments

- [x] Server-calculated totals; browser cannot alter amount.
- [x] Demo checkout only when Paystack keys are absent and explicitly enabled.
- [x] Demo checkout rejects production configuration.
- [x] Verify endpoint confirms status and returns course.
- [x] Webhook rejects invalid signatures.
- [x] Webhook idempotency (event stored once).
- [ ] Live Paystack transaction (requires live keys; run during launch acceptance).
- [ ] Live refund through Paystack (requires live keys).

### Database and recovery

- [x] Schema applies from migrations (`prisma migrate deploy`).
- [x] Seed creates courses, media, orders, enrolments and certificates.
- [x] Backup script produces a gzip dump and checksum.
- [ ] Restore rehearsal on a separate database (perform before launch).

---

## Known limitations (demo environment)

1. Demo videos are short public CC0 clips used to exercise streaming. Replace them
   with real course recordings before launch.
2. Paystack keys are intentionally blank, so checkout uses the guarded test flow.
3. Email is logged to the server console when SMTP is not configured.
4. The demo seed should not be run in production; create the owner account manually
   (see the deployment guide).
5. Email verification is not enforced at sign-in; the field exists and can be enabled
   later. Password reset is fully implemented.

---

## Reproducing the tests

```bash
# 1. Start the app
npm run build && npm start

# 2. In another terminal
psql -d braveskill -c 'delete from "RateLimitBucket";'   # reset test rate limits
npm run qa:flows
npm run qa:screens
```

For production-like results, run against the production build — cold compilation in
development can exceed the test timeouts.
