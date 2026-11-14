# Deployment guide

Target domain: **academy.emyphilltech.com.ng**
Owner: **Emyphill-Tech Global Solutions Limited**

> **Primary platform: Cloudflare.** See [`CLOUDFLARE.md`](CLOUDFLARE.md) for the
> Workers + R2 + Hyperdrive deployment. This document covers the equivalent
> Node/VPS deployment and remains the fallback and local production reference.

---

## 1. Recommended production setup

| Item | Recommendation |
| --- | --- |
| Server | Ubuntu 24.04 LTS, 2 vCPU, 4GB RAM, 80GB SSD (grows with video library) |
| Node.js | 22 LTS |
| Database | PostgreSQL 16, local or managed (Neon, Supabase, RDS) |
| Reverse proxy | Nginx with Let's Encrypt TLS |
| Process manager | systemd (or PM2) |
| Media storage | Encrypted block volume mounted at `/var/www/brave-skill/storage` |
| Backups | Nightly `pg_dump`, off-site copy, 30-day retention |
| Monitoring | Uptime check on `/api/health` + error alerting |

The app is a stateful-media, stateless-compute system: you can run multiple app
instances, but the storage volume must be shared (or moved to S3-compatible storage).

---

## 2. First-time server setup

```bash
# as a sudo user
apt update && apt upgrade -y
apt install -y curl git nginx postgresql postgresql-contrib ufw certbot python3-certbot-nginx

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Create the database and a dedicated user:

```bash
sudo -u postgres psql
CREATE USER braveskill WITH PASSWORD 'use-a-long-random-password';
CREATE DATABASE braveskill OWNER braveskill;
\q
```

Create the application user and directory:

```bash
adduser --disabled-password --gecos "" braveskill
mkdir -p /var/www/brave-skill/storage /var/www/brave-skill/backups
chown -R braveskill:braveskill /var/www/brave-skill
```

---

## 3. Deploy the code

```bash
su - braveskill
cd /var/www/brave-skill
git clone https://github.com/Nwite200/brave-skill-project.git .
npm ci
```

Create `.env` (never commit it):

```env
DATABASE_URL="postgresql://braveskill:PASSWORD@localhost:5432/braveskill?schema=public"
AUTH_SECRET="<openssl rand -base64 48>"
NEXT_PUBLIC_SITE_URL="https://academy.emyphilltech.com.ng"
NEXT_PUBLIC_SITE_NAME="Brave Skill"
NEXT_PUBLIC_SUPPORT_EMAIL="support@academy.emyphilltech.com.ng"
NEXT_PUBLIC_SUPPORT_PHONE="+234 ..."
NEXT_PUBLIC_WHATSAPP="234..."
PAYSTACK_PUBLIC_KEY="pk_live_..."
PAYSTACK_SECRET_KEY="sk_live_..."
ALLOW_DEMO_PAYMENTS="false"
STORAGE_DIR="/var/www/brave-skill/storage"
SMTP_HOST="smtp.provider.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="Brave Skill <no-reply@academy.emyphilltech.com.ng>"
BACKUP_DIR="/var/www/brave-skill/backups"
ADMIN_ALERT_EMAILS="owner@emyphilltech.com.ng"
```

Apply the schema and build:

```bash
npx prisma migrate deploy
npm run build:next
```

### Create the first administrator

Do **not** run the demo seed in production. Create the owner account with a one-off
script:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
(async () => {
  const passwordHash = await bcrypt.hash(process.argv[1], 12);
  await db.user.create({ data: {
    name: 'Academy Owner',
    email: 'owner@emyphilltech.com.ng',
    passwordHash,
    role: 'MASTER_ADMIN',
    emailVerified: new Date()
  }});
  console.log('Owner account created');
  await db.\$disconnect();
})();
" 'ReplaceWithAStrongPassword1'
```

Then create categories and courses from `/admin`.

---

## 4. Process management (systemd)

`/etc/systemd/system/brave-skill.service`:

```ini
[Unit]
Description=Brave Skill web application
After=network.target postgresql.service

[Service]
Type=simple
User=braveskill
Group=braveskill
WorkingDirectory=/var/www/brave-skill
EnvironmentFile=/var/www/brave-skill/.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
TimeoutStopSec=30
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now brave-skill
systemctl status brave-skill
```

Logs: `journalctl -u brave-skill -f`

### Alternative: standalone server

`npm run build` produces `.next/standalone` when `NEXT_OUTPUT_STANDALONE=1`.
Copy `.next/static` and `public` into it, then run `node server.js`. The included
`Dockerfile` does this automatically.

### Docker Compose

```bash
cp .env.example .env       # set AUTH_SECRET, POSTGRES_PASSWORD, Paystack keys
docker compose up -d --build
docker compose exec web npx prisma migrate deploy
```

Mount the storage volume on encrypted disk and back it up separately from the database.

---

## 5. Nginx + TLS

`/etc/nginx/sites-available/brave-skill`:

```nginx
server {
    listen 80;
    server_name academy.emyphilltech.com.ng;
    client_max_body_size 1100M;
    client_body_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

```bash
ln -s /etc/nginx/sites-available/brave-skill /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d academy.emyphilltech.com.ng
```

Verify: `https://academy.emyphilltech.com.ng/api/health` returns `{"status":"ok"}`.

DNS: create an `A` record for `academy` pointing to the server IP (and `AAAA` if IPv6).
The domain and DNS account must remain in Emyphill-Tech's ownership.

---

## 6. Paystack configuration

1. Create/verify the Paystack business account under **Emyphill-Tech Global Solutions
   Limited**.
2. Complete KYC and settlement bank details.
3. Copy the **live** public and secret keys into `.env`.
4. Set the webhook URL to:
   `https://academy.emyphilltech.com.ng/api/payments/webhook`
5. Callback URL is generated per transaction by the app; no dashboard setting required.
6. Run a live test: buy a low-priced course, confirm the order becomes `PAID`, the
   enrolment unlocks, the receipt works, then refund it and confirm access is revoked.

**Never** grant access based on the browser callback alone. The system verifies every
transaction with Paystack and re-verifies webhook payloads.

If Paystack is not configured, the app falls back to a test checkout only when
`ALLOW_DEMO_PAYMENTS=true`. Set it to `false` in production; the app will then refuse
checkout instead of granting free access.

---

## 7. Email

Configure SMTP so payment confirmations and password resets are delivered.
Without SMTP, emails are logged to the server console (useful for staging).

Send a test through **Forgot password** and confirm delivery. Ensure SPF and DKIM
records are set for the sending domain.

---

## 8. Backups and recovery

Nightly cron for the app user:

```cron
15 2 * * * cd /var/www/brave-skill && ./scripts/backup-db.sh >> backups/backup.log 2>&1
30 2 * * * tar -czf backups/storage-$(date +\%F).tar.gz -C /var/www/brave-skill storage && find backups -name 'storage-*.tar.gz' -mtime +14 -delete
```

- Copy backups off the server (object storage or a second host) every night.
- Test a restore monthly on a staging database:
  `gunzip -c backups/braveskill-YYYYMMDD-HHMMSS.sql.gz | psql "$DATABASE_URL"`
- Media is not reproducible from the database: back up `storage/` separately.
- Recovery procedure:
  1. Provision the server and install dependencies.
  2. Restore the latest database dump into a fresh database.
  3. Restore the storage archive.
  4. Deploy the matching code revision, run `npx prisma migrate deploy`.
  5. Update `AUTH_SECRET` only if sessions must be invalidated.
  6. Verify `/api/health`, sign in, play a video and download a certificate.

---

## 9. Monitoring and maintenance

- Uptime monitor on `https://.../api/health` every minute; alert on non-200.
- Forward `journalctl`/Docker logs to a log service; alert on 5xx spikes.
- Disk alert at 80% (video library growth).
- `npm audit` and OS security updates monthly.
- Review Paystack settlements against **Admin → Revenue** monthly.
- Keep Node, PostgreSQL and dependencies patched in a staging environment first.

---

## 10. Going live — final checklist

- [ ] Domain `academy.emyphilltech.com.ng` resolves and TLS is valid.
- [ ] `ALLOW_DEMO_PAYMENTS=false`.
- [ ] Paystack live keys + webhook configured and tested.
- [ ] Owner master account created; demo accounts removed.
- [ ] SMTP configured and tested.
- [ ] Support email, phone, WhatsApp and social links replaced.
- [ ] At least one real course with video, PDF, quiz and exam published.
- [ ] Certificate generation, public verification and PDF download tested.
- [ ] Android APK uploaded to **Website → Android app**.
- [ ] Nightly backups running and a restore has been rehearsed.
- [ ] `AUTH_SECRET` stored in the company password manager.
- [ ] Repository access restricted to company accounts.
- [ ] Google Play account and signing keystore in company custody.
