# Security

This document describes the controls implemented in Brave Skill, the assumptions
behind them, and the operational practices required to keep the academy safe.

---

## 1. Identity and sessions

- Passwords are hashed with **bcrypt (cost 12)**. Plain-text passwords are never logged.
- Sessions are **HS256 JWTs** signed with `AUTH_SECRET`, valid for 7 days.
- Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, path `/`.
- Every request reloads the user; suspended accounts are rejected immediately.
- Changing a password or resetting it increments `tokenVersion`, invalidating all
  other sessions.
- Login is rate-limited per IP and per email to slow credential stuffing.
- There is no public signup for privileged roles. Staff accounts are created by an
  administrator.

**Operational requirements**

- 32+ random bytes for `AUTH_SECRET`, stored in a password manager.
- Unique passwords for every staff account.
- Remove demo accounts before launch.
- Consider adding TOTP 2FA for administrator accounts before scaling the team.

---

## 2. Authorisation

- Role checks exist at three layers: middleware redirects, page guards, and every API
  handler (`requireUser`, `requireStaff`, `requireAdmin`).
- Instructors are constrained to their own courses at the query level and in
  `lib/admin-content.ts` ownership checks.
- Course media is authorised per asset: staff, free-preview lessons, or an active
  enrolment in the owning course.
- Certificates cannot be issued without a valid enrolment; exam certificates require a
  passed, server-graded attempt.

---

## 3. Payments

- Amounts are computed and stored server-side in integer kobo.
- The browser cannot unlock a course: only `fulfillOrder()` transitions an order.
- Paystack transactions are verified with the Paystack API before fulfilment, including
  amount and currency checks.
- Webhook signatures are validated with a timing-safe HMAC SHA-512 comparison.
- Webhook events are stored by `(provider, eventId)` to prevent replay/double processing.
- Fulfilment itself is idempotent: `updateMany` with `status = PENDING`.
- Refunds revoke enrolment and certificates and are written to the audit log.
- Test checkout is disabled whenever Paystack keys exist, and must be disabled in
  production (`ALLOW_DEMO_PAYMENTS=false`).

**Recommendations**

- Enable Paystack transaction email notifications.
- Reconcile settlements monthly against the revenue report.
- Alert on repeated `payment.amount_mismatch` audit entries.

---

## 4. Request and input protection

- All request bodies are parsed with **Zod** schemas (types, lengths, ranges).
- Mutating requests validate `Origin` against `Host` (CSRF defence). Cookies are
  `SameSite=Lax` as a second layer.
- Rate limiting is fixed-window and database-backed, applied to login, registration,
  reset, checkout, coupons and contact.
- Prisma parameterises all SQL. The only raw query is the rate-limit upsert.
- CSV exports escape quotes and prefix cells to prevent spreadsheet formula injection.
  Cells beginning with `=`, `+`, `-` or `@` should be treated as untrusted when opened.
- Next.js sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` and HSTS headers.

---

## 5. File uploads and media

- Allowed kinds: video (MP4/WebM), PDF, image (PNG/JPG/WebP/SVG), APK.
- MIME type, extension and size are validated per kind.
  Limits: video 1GB, PDF 100MB, image 8MB, APK 300MB.
- Files are stored with random UUID keys under `STORAGE_DIR`; path traversal is blocked.
- Nothing sensitive is stored in `public/`. Media is streamed through
  `/api/media/[id]` after authorisation, with `Cache-Control: private, no-store`.
- Uploaded SVG images are served with `Content-Type: image/svg+xml`. Only staff can
  upload images, so the risk is limited, but consider converting uploads to raster.
- APKs are served with `Content-Disposition: attachment` and `nosniff`.

**Operational requirements**

- Keep the storage volume on encrypted disk.
- Back up storage separately from the database.
- If moving to S3, keep the bucket private and issue short-lived signed URLs.

---

## 6. Data protection (NDPR)

- Collect only what is needed: name, email, phone, learning data, order data.
- Payment card data never reaches the server (Paystack-hosted checkout).
- The privacy policy explains purpose, retention, sharing and rights.
- Data subject requests are handled through support; deletion must preserve financial
  records where legally required.
- Access to production data is limited to authorised staff accounts.
- Logs contain emails/IPs; restrict log access accordingly.

---

## 7. Audit logging

Written for:

- logins, failed logins and logouts;
- payment fulfilment and webhook outcomes;
- refunds and manual grants;
- course/content updates and deletions;
- user creation, suspension, password reset and role changes;
- certificate issue, revocation and download;
- report exports and contact-message handling.

Logs are append-only from the application's perspective and visible under
**Admin → Audit logs**. Export or ship them to an external store for long-term
retention.

---

## 8. Secrets and access

- `.env` is gitignored. Only the deployment user can read it (`chmod 600`).
- Paystack secret keys, SMTP credentials and `AUTH_SECRET` live in the company
  password manager and the server environment — never in code or chat.
- Database access is limited to the app user and administrators.
- SSH: key-based only, no root password login, firewall restricted where possible.
- Repository access: company GitHub organisation, 2FA enforced.
- Android signing keystore: offline backup, password in the password manager, never
  committed.

---

## 9. Incident response

1. **Contain** — disable the affected account, rotate the exposed secret, or put the
   site in maintenance if necessary.
2. **Assess** — review audit logs, Paystack events and server logs. Determine scope
   (accounts, payments, media).
3. **Eradicate** — patch the vulnerability, invalidate sessions (`AUTH_SECRET` rotation),
   reset affected passwords.
4. **Notify** — inform affected users and the relevant authority where required by the
   NDPA. Preserve evidence.
5. **Learn** — update this document and add a regression test.

Useful commands:

```bash
# invalidate all sessions immediately
openssl rand -base64 48   # set new AUTH_SECRET, restart the service

# inspect recent security events
psql "$DATABASE_URL" -c "select \"createdAt\", action, \"entity\", \"entityId\" from \"AuditLog\" order by \"createdAt\" desc limit 50;"
```

---

## 10. Pre-launch security checklist

- [ ] `ALLOW_DEMO_PAYMENTS=false`
- [ ] Unique `AUTH_SECRET` and database password
- [ ] Demo accounts removed
- [ ] Paystack webhook signature verified in staging and production
- [ ] HTTPS enforced; HSTS active
- [ ] Backups encrypted and tested
- [ ] Storage directory not web-accessible
- [ ] Admin accounts use strong, unique passwords
- [ ] Dependency audit reviewed
- [ ] Staff roles follow least privilege
