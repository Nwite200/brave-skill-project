# Brave Skill — Cloudflare-native deployment

Brave Skill runs on Cloudflare Workers. Its application database is **Cloudflare D1** and its uploaded media is **Cloudflare R2**. There is no PostgreSQL database, Hyperdrive, Supabase, Firebase, VPS or local persistent disk in production.

## Cloudflare architecture

| Responsibility | Cloudflare service |
| --- | --- |
| Next.js frontend and server-rendered application | Workers + OpenNext |
| Backend API routes and server actions | Same Cloudflare Worker |
| Relational database | D1 |
| Course videos, PDFs, images and APK files | R2 |
| DNS, TLS and edge protection | Cloudflare DNS / WAF |
| Optional future cache and asynchronous jobs | KV / Queues, when application features need them |

The Worker accesses D1 through its native DB binding using Prisma's `@prisma/adapter-d1`. Payment fulfilment and refunds use D1 batch operations for atomic multi-statement updates; Prisma's D1 adapter does not provide ACID transactions.

## 1. Create the Cloudflare resources

In the Cloudflare dashboard:

1. Open **Storage & databases → D1 SQL Database** and create a database named `brave-skill-db`.
2. Copy its database ID and replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc`.
3. Create an R2 bucket named `brave-skill-media`.
4. Create an R2 API token scoped to that bucket with Object Read & Write permissions.
5. Create a Cloudflare API token scoped to D1 read/write and Workers deployment. Do not use the Global API Key.

## 2. Configure Worker secrets

Set the following secrets for the Worker (Cloudflare dashboard → Workers & Pages → brave-skill → Settings → Variables and Secrets):

```bash
npx wrangler secret put CLOUDFLARE_D1_TOKEN
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_DATABASE_ID
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put AUTH_SECRET
npx wrangler secret put PAYSTACK_PUBLIC_KEY
npx wrangler secret put PAYSTACK_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
```

Set non-secret variables in `wrangler.jsonc`, including `CF_WORKER=1` and `R2_BUCKET=brave-skill-media`.

D1 is supplied through the DB binding declared in wrangler.jsonc. The seed script uses CLOUDFLARE_D1_TOKEN, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_DATABASE_ID from your local .env file. R2 credentials are used by the existing S3-compatible R2 storage client. The Worker refuses to fall back to local filesystem storage if R2 is not configured.

## 3. Create the D1 schema

Generate SQL from the Prisma schema and apply it to the remote D1 database:

```bash
npm ci
npx prisma generate
mkdir -p migrations
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > migrations/0001_initial.sql
npx wrangler d1 execute brave-skill-db --remote --file=migrations/0001_initial.sql
```

Run the initial schema command once for a newly created D1 database. Do not repeatedly reapply the initial SQL to an already initialized database. For subsequent schema changes, create a new numbered SQL migration and apply that file.

## 4. Build and deploy

```bash
npm run cf:build
npm run cf:deploy
```

The GitHub Actions workflow deploys on pushes to `main`. Configure these repository secrets:

- `CLOUDFLARE_API_TOKEN` — Workers deployment and D1 permissions
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_TOKEN`
- `CLOUDFLARE_DATABASE_ID`

The workflow generates and applies the initial D1 SQL before deploying. The database must already exist in the Cloudflare account, and its ID must be set in wrangler.jsonc.

## 5. Verify

- Visit `/api/health` and confirm database status is `up`.
- Create the first administrator account.
- Test registration, login, course creation, enrolment, quiz attempts and certificates.
- Upload a cover image, PDF and video; verify they are stored in R2 and streamed with HTTP range support.
- Configure Paystack and email delivery secrets before enabling those integrations.

## Important notes

- Paystack remains the payment processor; payment records and application workflows live in D1.
- Email delivery may use Resend's HTTP API. Email is a delivery provider, not the application's database or hosting.
- KV and Queues are not wired into application features yet. Add them when a concrete caching or background-job workflow is implemented rather than adding unused bindings.
- D1 is SQLite-compatible. Review queries and transaction use against D1 limits before launch.
- Never commit API tokens, R2 credentials, authentication secrets or payment secrets.
