# Deployment guide — Cloudflare only

Brave Skill production hosting is Cloudflare Workers (OpenNext), Cloudflare D1 and Cloudflare R2. The former PostgreSQL/VPS instructions have been retired and must not be used for this project.

Follow docs/CLOUDFLARE.md for the current deployment procedure.

## Required Cloudflare resources

- Worker: brave-skill
- D1 database: brave-skill-db
- R2 bucket: brave-skill-media
- Custom domain: academy.emyphilltech.com.ng

## Database and media

The application uses Prisma with the Cloudflare D1 adapter. Set CLOUDFLARE_D1_TOKEN, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_DATABASE_ID as Worker secrets. Media is stored in R2 using the S3-compatible API. The Worker deliberately refuses to fall back to its ephemeral local filesystem when R2 is not configured.

## Initial setup

1. Create the D1 database and R2 bucket in the Cloudflare dashboard.
2. Configure the secrets listed in docs/CLOUDFLARE.md.
3. Generate and apply the initial D1 schema.
4. Deploy the Worker from the GitHub Actions workflow.
5. Verify /api/health, authentication, course creation, payments and media streaming.

Do not configure PostgreSQL, Hyperdrive, a VPS, Docker-hosted database, Supabase or Firebase for production.
