# Cloudflare deployment

Brave Skill is structured for **Cloudflare Workers + R2 + Hyperdrive + Cloudflare
DNS**, with the existing Node/PostgreSQL path retained as a fallback.

```
                    Cloudflare edge
Browser / Android ────────────────► Worker (Next.js via OpenNext)
                                        │
                     ┌──────────────────┼───────────────────┐
                     ▼                  ▼                   ▼
              Hyperdrive ───────► PostgreSQL          R2 (private media)
              (pooled)             (Neon/Supabase/        videos, PDFs, APK
                                    RDS/self-hosted)
                     │
                     └── Resend HTTP API (transactional email)
```

Why this shape:

- **Workers** run the Next.js app close to learners with automatic scaling.
- **Hyperdrive** pools and accelerates connections to Postgres from the edge.
- **R2** stores course media privately; it is served only through authorised
  API routes, with presigned direct uploads for large videos.
- **Workers AI** provides the assistant's reasoning on its free daily allocation,
  with no external API key; the grounded engine is the fallback. This keeps the AI
  assistant free to operate within Cloudflare's allowance.
- **Cloudflare DNS/WAF/Access** provide the domain, TLS, rate limiting and an
  extra identity gate for `/admin`.

The Worker uses the Prisma **pg driver adapter** (`@prisma/adapter-pg`) because the
native query engine cannot run in Workers. `lib/db.ts` switches automatically when
`CF_WORKER=1`.

---

## 1. Prerequisites

- Cloudflare account with the `emyphilltech.com.ng` zone
- **Workers Paid** plan (recommended; the Worker bundle with Prisma/Next exceeds the
  free 3MB limit)
- PostgreSQL 15+ (Neon, Supabase, RDS, or your existing server)
- R2 bucket (media)
- Resend account (email)
- Wrangler CLI (installed as a dev dependency)

Install and authenticate:

```bash
npx wrangler login
npx wrangler whoami
```

---

## 2. Database and Hyperdrive

Create the database and run migrations from your machine or CI using a **direct**
connection string:

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/braveskill?sslmode=require"
npx prisma migrate deploy
```

Create a Hyperdrive configuration pointing at the same database:

```bash
npx wrangler hyperdrive create brave-skill \
  --connection-string="postgresql://user:pass@host:5432/braveskill?sslmode=require"
```

Copy the returned connection string (it looks like
`postgres://...@...hyperdrive...`). It becomes the Worker's `DATABASE_URL`.

> Hyperdrive requires `nodejs_compat`, which is enabled in `wrangler.jsonc`.
> Keep the direct URL only in CI/secrets for migrations; never expose it to the browser.

---

## 3. R2 bucket and CORS

Create the bucket:

```bash
npx wrangler r2 bucket create brave-skill-media
```

Create an R2 API token with **Object Read & Write** for this bucket. You will need:

- Account ID
- Access Key ID
- Secret Access Key

Set the bucket CORS policy to allow browser-direct uploads from the academy domain
(R2 dashboard → bucket → Settings → CORS):

```json
[
  {
    "AllowedOrigins": ["https://academy.emyphilltech.com.ng"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Files up to 70MB upload through the Worker. Larger videos automatically use a
presigned PUT directly to R2, then register the asset in the database, avoiding the
Worker request-body limit.

---

## 4. Worker secrets and variables

Set secrets (never commit them):

```bash
npx wrangler secret put DATABASE_URL          # Hyperdrive connection string
npx wrangler secret put AUTH_SECRET           # openssl rand -base64 48
npx wrangler secret put PAYSTACK_PUBLIC_KEY
npx wrangler secret put PAYSTACK_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
# The AI assistant needs NO key: Workers AI uses the free binding in wrangler.jsonc.
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

Non-secret variables live in `wrangler.jsonc`:

```jsonc
"vars": {
  "CF_WORKER": "1",
  "NEXT_PUBLIC_SITE_NAME": "Brave Skill",
  "NEXT_PUBLIC_SITE_URL": "https://academy.emyphilltech.com.ng",
  "R2_BUCKET": "brave-skill-media",
  "R2_REGION": "auto",
  "RESEND_FROM": "Brave Skill <no-reply@academy.emyphilltech.com.ng>"
}
```

`NEXT_PUBLIC_*` values are inlined at **build time**. Set them in the build
environment (GitHub Actions or `.env.cloudflare`) as well as in `wrangler.jsonc`.

---

## 5. Build and deploy

```bash
npm ci
npx prisma generate

# Public build-time values
export NEXT_PUBLIC_SITE_URL="https://academy.emyphilltech.com.ng"
export NEXT_PUBLIC_SITE_NAME="Brave Skill"
export NEXT_PUBLIC_SUPPORT_EMAIL="support@academy.emyphilltech.com.ng"

npm run cf:build      # prisma generate + Next.js + OpenNext worker bundle
npm run cf:deploy     # wrangler deploy
```

The GitHub workflow [`.github/workflows/deploy-cloudflare.yml`](../.github/workflows/deploy-cloudflare.yml)
runs migrations, builds and deploys on every push to `main`. Add these repository
secrets:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Workers Scripts:Edit, R2:Edit, Hyperdrive:Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `DATABASE_URL` | Direct Postgres URL for `prisma migrate deploy` |

---

## 6. First deployment checklist

1. Deploy the Worker.
2. Visit `https://academy.emyphilltech.com.ng/api/health` — expect `{"status":"ok","database":"up"}`.
3. Create the owner account manually (see `docs/DEPLOYMENT.md`) — do **not** run the demo seed.
4. Sign in at `/admin`, create categories and courses.
5. Upload a small cover image, a PDF and a video (test the direct R2 path).
6. Configure Paystack live keys and the webhook:
   `https://academy.emyphilltech.com.ng/api/payments/webhook`.
7. Run a real low-value purchase and refund.
8. Disable the demo checkout by ensuring `PAYSTACK_SECRET_KEY` is set.
9. Upload the signed APK under **Website → Android app**.

---

## 7. DNS and custom domain

`wrangler.jsonc` declares:

```jsonc
"routes": [{ "pattern": "academy.emyphilltech.com.ng", "custom_domain": true }]
```

On deploy, Cloudflare creates the DNS record and certificate automatically for a zone
in the same account. Keep the domain registration and DNS zone in
**Emyphill-Tech's** account and enable registrar lock + auto-renew.

If the zone is elsewhere, add the `A`/`AAAA` or CNAME record Cloudflare provides and
move nameservers only after approval.

---

## 8. Caching and security rules

Create these rules in **Caching → Cache Rules**:

| Path | Rule |
| --- | --- |
| `/_next/static/*`, `/brand/*`, `/manifest.webmanifest` | Cache eligible, long TTL, respect origin headers |
| `/api/*` | Bypass cache |
| `/dashboard*`, `/admin*`, `/checkout*`, `/login`, `/register` | Bypass cache |

Additional hardening:

- **Cloudflare Access** → protect `academy.emyphilltech.com.ng/admin*` with email OTP
  or Google SSO for staff. This sits in front of the app's own role checks.
- **WAF rate limiting** → 20 requests/min per IP on `/api/auth/login` and
  `/api/auth/register` (the app also has database-backed limits).
- **Bot Fight Mode / Turnstile** → optional on registration and contact forms.
- **Security headers** are already set by Next.js; enforce HTTPS and HSTS.
- **Under Attack Mode** only during an active incident.

---

## 9. Observability and operations

```bash
npx wrangler tail brave-skill --format pretty
npx wrangler deployments list
npx wrangler rollback [deployment-id]
```

- Enable Workers Logs/Tail and alert on 5xx rate.
- Uptime monitor on `/api/health` every minute.
- Review `Admin → Audit logs` for security events.
- R2 stores media durably, but enable bucket versioning/lifecycle if available for
  accidental-deletion recovery.

---

## 10. Backups

Database:

```bash
pg_dump "$DIRECT_DATABASE_URL" --no-owner --no-privileges | gzip -9 > braveskill-$(date +%F).sql.gz
```

- Run nightly from GitHub Actions or a small always-on host (Workers cannot run
  `pg_dump`).
- Copy dumps to a second provider or an R2 bucket with a separate credential.
- Test a restore monthly on a staging database.

Media:

- R2 is durable, but keep a periodic copy with `rclone`/`aws s3 sync` from R2 to a
  second bucket or provider.
- Never make the media bucket public; all access is entitlement-checked.

Add a scheduled workflow using `postgres` client and `rclone` if you want this fully
managed in GitHub. The scripts `scripts/backup-db.sh` remain useful for the Node
deployment.

---

## 11. Limits and design notes

| Limit | Implication |
| --- | --- |
| Worker request body ~100MB | Large videos use presigned R2 uploads |
| Worker CPU time | PDF certificates are generated on demand; cache/reuse where possible |
| Worker bundle size | Requires Workers Paid; avoid adding large SDKs |
| Postgres connections | Hyperdrive pools; Prisma adapter capped at 5 connections per isolate |
| No local filesystem | `lib/storage.ts` switches to R2 when `R2_*` is configured |
| Workers AI free quota | The assistant falls back to the grounded engine if quota is exhausted |
| No SMTP sockets | Email uses Resend's HTTP API (`lib/mail.ts`) |

---

## 12. Local preview

```bash
cp .env.cloudflare.example .dev.vars
npm run cf:build
npm run cf:preview
```

`wrangler dev` runs the Worker locally with Miniflare. If Hyperdrive is not available
locally, set `DATABASE_URL` in `.dev.vars` to a direct Postgres URL (reachable from
your machine) for preview only.

---

## 13. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `PrismaClientInitializationError` | Ensure `CF_WORKER=1`, adapter installed, `DATABASE_URL` set to Hyperdrive string |
| `Database connection failed` | Check Hyperdrive config, database SSL mode, IP allow-list |
| Worker 1102 / CPU exceeded | Reduce PDF/report work per request; move heavy exports to a job |
| Upload 413 | File >100MB through Worker; ensure direct R2 presign path is used |
| Upload 403 from R2 | CORS missing `PUT` or wrong origin; check API token permissions |
| Media 401/403 | Learner not enrolled; video assets require entitlement |
| Email not delivered | Verify domain in Resend, check `RESEND_API_KEY`, inspect response logs |
| Stale public content | Purge Cloudflare cache or check the cache rule bypass |
