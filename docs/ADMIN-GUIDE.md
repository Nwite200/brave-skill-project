# Administrator guide

This guide is written for the academy owner and staff. Everything described here is
available in the administrator console at **`/admin`**.

---

## 1. Signing in

1. Go to `https://academy.emyphilltech.com.ng/login`.
2. Enter an administrator email and password.
3. Staff accounts are redirected to `/admin`; students go to `/dashboard`.

Roles:

| Role | Use it for |
| --- | --- |
| **Master administrator** | Full control, including changing other staff roles. Keep this account for the owner only. |
| **Administrator** | Day-to-day academy management: content, students, payments, certificates, website. |
| **Instructor** | Building and maintaining their own courses and assessments only. |
| **Student** | Learning portal. |

> Use a unique password, enable 2FA on the email account, and never share the master
> account. Password changes sign out all other sessions.

---

## 2. Dashboard

The dashboard shows revenue, students, enrolments and certificates, a six-month
revenue chart, recent transactions, top programmes, new students and quick actions.

- “Pending orders” are checkouts that were started but not confirmed. They should
  normally clear themselves; investigate anything older than 24 hours.
- “New enquiries” come from the contact form. They are listed under **Website →
  Contact inbox**.

---

## 3. Categories

**Categories** group courses into career tracks and drive the public filters.

1. Open **Admin → Categories → New category**.
2. Enter a name (e.g. “Solar & Inverter”).
3. Leave the slug blank to generate it from the name.
4. Pick an icon key and accent colour; they are used on website cards.
5. Set a position to control ordering, tick **Visible on website** and save.

Deleting a category that still contains courses will fail. Move or delete the
courses first.

---

## 4. Creating a course

**Admin → Courses → New course.**

### Basics tab

| Field | Notes |
| --- | --- |
| Title | Student-facing name. Keep it specific. |
| Slug | URL segment. Generated automatically; change only if needed. |
| Category | Required. Create categories first. |
| Subtitle | Optional supporting line. |
| Summary | Shown on cards. 1–2 sentences, maximum 400 characters. |
| Level | Beginner / Intermediate / Advanced. |
| Duration label | Free text such as “6 weeks · 12 hours of video”. |
| Instructor | Assign a faculty account (optional). |

### Description tab

- **Full description** — paragraphs separated by a blank line. Explain who it is for,
  what they will build and what makes the programme practical.
- **Learning outcomes** — one per line. These render as a two-column checklist.
- **Requirements** — one per line (tools, prior knowledge, device).

### Pricing & settings tab

| Setting | Behaviour |
| --- | --- |
| Price | In Nigerian Naira. Enter `0` for a free course. |
| Compare-at price | Optional crossed-out reference price. |
| Exam pass mark | Percentage required to pass the final assessment. |
| Promo video URL | Optional YouTube/Vimeo/direct MP4 link. |
| Certificate | Issue a verifiable certificate on completion. |
| Final assessment required | If on, students must pass the exam. If off, the certificate is issued when every lesson is complete. |
| Published | Makes the course live on the website **and** Android app immediately. |
| Featured | Promotes it on the homepage. |

Instructors can create and edit their own courses but cannot publish or feature them;
an administrator must review and publish.

### Cover image

Upload a 16:9 image (PNG/JPG/WebP, max 8MB) or leave blank to use the generated
branded cover. Uploads are stored privately and served through an authorised route.

---

## 5. Curriculum: modules, lessons and media

After saving a course, scroll to **Curriculum** on the same page.

### Modules

1. Click **Add module**.
2. Give it a clear title (e.g. “Load Audit and System Design”).
3. Modules are ordered by creation order; drag-free reordering is available from
   **Admin → Modules** using the position field.

### Lessons

1. Expand a module and click **Add lesson**.
2. Choose the type:
   - **Video** — upload MP4/WebM (max 1GB) or paste a hosted URL (Vimeo, YouTube,
     direct MP4).
   - **PDF** — upload a PDF field guide (max 100MB). Learners can read it in the
     portal and download it.
   - **Text** — write the lesson directly; ideal for short briefings.
3. Set a duration in minutes (used for curriculum totals and the player).
4. Tick **Free preview** to let visitors watch without enrolling.
5. Tick **Published** to make the lesson visible.
6. Save.

Uploads show an “attached” confirmation. Videos stream through an entitlement-checked
endpoint and support seeking. **Never share a media URL** — it requires the learner's
session.

Deleting a lesson removes its progress records. Deleting a module removes all of its
lessons.

---

## 6. Assessments and certificates

### Module progression

Each module can have one or more quizzes. Mark a quiz **Required for progression** to
unlock the next module only after it is passed. The quiz becomes available when every
published lesson in that module is complete. A locked module hides its lessons and
blocks video/PDF access at the server, even if a student guesses the URL.

Suggested defaults: 10 questions, 70% pass mark, 20 minutes, 2 attempts, randomise
questions and options. All are configurable per quiz.

### Video library and Cloudflare Stream

**Admin → Video library** lists every uploaded video, its provider, status, usage and
delete action. Uploads use private local/R2 storage until Cloudflare Stream is
approved and configured. Once connected, uploads become resumable with progress,
playback uses signed tokens, and the player overlays the student email. See
`docs/VIDEO.md`; do not add Stream credentials without owner approval.


**Admin → Examinations → New assessment.**

- **Type** — `Final exam` unlocks certificates (requires all lessons complete) or
  `Module quiz` for practice.
- **Pass mark** — default 70% for exams, 60% for quizzes.
- **Time limit** — enforced on the server with a 90-second network grace period.
  `0` means no limit.
- **Max attempts** — `0` means unlimited. Otherwise students see their remaining
  attempts.

Add questions with the **Questions** editor:

1. Write the prompt.
2. Fill 2–6 options and select the correct one with the radio button.
3. Add an explanation (shown in quiz review).
4. Set points (default 1).
5. Save.

Grading is always server-side. Answers are never sent to the browser before
submission.

### Certificates

Certificates are issued automatically when a student passes the final exam with all
lessons complete (or completes all lessons when no exam is required).

- **Admin → Certificates** lists serials, recipients, courses and status.
- **Issue certificate** manually for verified prior learning. The student must already
  be enrolled.
- **Revoke** marks the certificate invalid immediately on the public verification page.
- Every certificate has a serial like `BS-2026-4F2A9C` and an integrity hash.

Public verification: `https://academy.emyphilltech.com.ng/verify`.

---

## 7. Students

**Admin → Students.**

- Search by name or email.
- **Grant access** enrols a student manually without a payment (use for scholarships,
  staff training or support resolutions). An audit entry is created.
- **Reset password** sets a temporary password and signs out existing sessions. Share
  it through a secure channel and ask the student to change it.
- **Suspend** blocks sign-in immediately. **Activate** restores access.
- Counts show enrolments and certificates per learner.

To create an account manually, use **New student** and provide a temporary password.

> For payment issues, always confirm the order in **Transactions** before granting
> access manually. If a real payment exists, the webhook will normally unlock it.

---

## 8. Instructors

**Admin → Instructors → New instructor.** Provide name, email, temporary password and
a headline. Instructors can then sign in at `/admin` and manage only their own courses,
modules, lessons, assessments and questions.

Instructors cannot:

- see student records, transactions or revenue;
- publish or feature courses;
- create categories, coupons or announcements;
- issue or revoke certificates.

---

## 9. Transactions and refunds

**Admin → Transactions** lists every order with reference, student, course, amount,
status, gateway and date. Filter by status or search by reference/email.

Refund process:

1. Find the paid order.
2. Click **Refund**.
3. Enter a reason and type `REFUND` to confirm.
4. The system calls Paystack (when configured), marks the order refunded, revokes the
   enrolment and certificate, notifies the student and writes an audit entry.

Only paid orders can be refunded. Refunds are full by default in the console; partial
refunds can be issued through the Paystack dashboard and recorded by support.

See the public refund policy at `/refunds`.

---

## 10. Discount codes

**Admin → Discount codes → New code.**

- **Percentage** (`BRAVE20`) or **fixed amount** (`SOLAR10K`).
- Restrict to one course if needed.
- **Max uses** — `0` means unlimited. Usage increments only after a verified payment.
- **Minimum order** — prevents codes applying to cheap courses.
- **Starts / Expires** — optional validity window.
- **Active** — untick to disable immediately.

Codes are validated on the server at checkout; editing a code does not alter past
orders.

---

## 11. Announcements

**Admin → Announcements.** Choose the audience:

- **Everyone** — all active accounts.
- **All students** — learners only.
- **A specific course** — learners enrolled in that course.

Publishing creates an in-app notification for every recipient. Use the top bar
announcement (**Website → Announcement**) for public site-wide messages.

---

## 12. Website management

**Admin → Website.**

- **Homepage & identity** — hero eyebrow, headline, sub-headline, statistics, contact
  details, social links and the public announcement bar.
- **Android app** — version label, requirement text, release notes and APK releases
  (upload a signed APK to publish a new build).
- **Testimonials** — student quotes, rating and ordering.
- **FAQs** — grouped by category on the public FAQ page.
- **Contact inbox** — read, resolve, reply and delete enquiries.

Changes are live on the next page load. Clear wording and accurate contact details
matter more than clever copy.

---

## 13. Reports

**Admin → Reports.** Choose a date range and export CSV:

- **Revenue** — orders, discounts, refunds, gateway and dates.
- **Students** — accounts, status, enrolments, certificates.
- **Enrolments** — course access, price paid, progress count, completion.
- **Certificates** — serials, recipients, validity and revocation.
- **Courses** — catalogue performance.

Exports are logged in the audit trail. Store them in the company’s secure drive and
use them for accounting and monthly reviews.

---

## 14. Brave AI Assistant

**Admin → AI assistant** controls the website and Android voice/text assistant.

- **Overview** — conversations, messages, escalations, open tickets, containment and
  top intents.
- **Settings** — enable/disable, assistant name, greeting, tone, voice, speech rate,
  escalation email, anonymous access and additional instructions. The protected
  system rules (no invented prices, no private data leaks, no password requests)
  cannot be overridden. Speech uses the free device/browser engine; reasoning uses
  Cloudflare Workers AI's free allocation or the built-in grounded engine. No API key
  is required.
- **Knowledge** — add approved documents for policies, admissions or troubleshooting.
  Courses, FAQs and announcements are indexed automatically. Publishing a new course
  makes it available to the assistant immediately.
- **Conversations** — review transcripts, intents and tool use. Private tools are
  scoped to the signed-in student.
- **Tickets** — escalations created by the assistant, with status, priority and
  internal notes.

Test after changes: ask about a course price, check a payment reference while signed
in, ask for a human and confirm the ticket appears. Never put passwords, PINs or
customer card data into knowledge documents.

---

## 15. Settings and audit logs

**Admin → Settings** shows the health of the database, Paystack, storage and email,
lets you edit the academy identity, and lists staff roles. Only a master administrator
can change roles.

**Admin → Audit logs** records logins, payments, refunds, course changes, user changes,
certificate actions, exports and contact handling. Use it whenever something is
unclear.

---

## 16. Routine checklist

**Daily**

- Check new contact enquiries.
- Check pending orders older than 24 hours.
- Confirm the dashboard revenue matches expectations.

**Weekly**

- Review new enrolments and student progress.
- Publish one announcement or update.
- Export a revenue CSV for records.

**Monthly**

- Run a database backup and verify the checksum.
- Review audit logs for unusual activity.
- Confirm Paystack settlements against the revenue report.
- Update the Android app if needed and archive the signed build.

**Before launch**

- Remove demo accounts and demo content.
- Set `ALLOW_DEMO_PAYMENTS=false`.
- Configure Paystack live keys and the webhook URL.
- Configure SMTP.
- Replace placeholder phone/WhatsApp/social links.
- Test one real low-value purchase and refund.
- Confirm backups run automatically.

---

## 17. Troubleshooting

| Symptom | What to check |
| --- | --- |
| Student paid but course locked | Transactions → find reference. If `PAID`, access exists; ask them to sign out and in. If `PENDING`, verify the Paystack dashboard; the webhook may be delayed. Do not grant manually until confirmed. |
| Webhook failures | Paystack dashboard → Webhooks. URL must be `https://<domain>/api/payments/webhook` and the secret key must match the server. |
| Video will not play | Confirm the lesson has a video asset/URL and is published, and that the student is enrolled. Check the browser console for 403/401. |
| Certificate not issued | Exam passed? All lessons complete? Certificate enabled on the course? Check the student's enrolment status. |
| Upload fails | Check file type and size limits (video 1GB, PDF 100MB, image 8MB, APK 300MB). Check server disk space. |
| Admin page shows “access denied” | Your role does not include that area. Ask a master administrator. |
