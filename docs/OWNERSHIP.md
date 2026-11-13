# Ownership and handover

**Owner:** Emyphill-Tech Global Solutions Limited
**Product:** Brave Skill — Skill Acquisition Academy
**Domain:** https://academy.emyphilltech.com.ng

This document is the handover checklist for company ownership of the platform. All
accounts must be created with company email addresses and company-controlled recovery
methods.

---

## 1. Assets the company must own

| Asset | Where | Notes |
| --- | --- | --- |
| Domain `emyphilltech.com.ng` | Registrar account | Enable registrar lock and auto-renew |
| DNS records | DNS provider | `A`/`AAAA` for `academy`; email records |
| Source code | GitHub `Nwite200/brave-skill-project` | Company-owned repository; 2FA enforced |
| Hosting server | Company cloud/VPS account | Billing in company name |
| PostgreSQL database | Same server or managed provider | Company billing + admin access |
| Media storage | Server volume or company object storage | Encrypted; backed up |
| Paystack account | Company business account | KYC in company name, settlement to company bank |
| Google Play developer account | Company account | $25 registration, company identity |
| Android signing keystore | Company custody (offline) | Two encrypted backups, password in vault |
| Transactional email | Company SMTP provider | SPF/DKIM configured |
| Brand assets | This repository (`public/brand/`) | Logos, icons, OG, Play graphics |
| Documentation | This `docs/` folder | Deployment, admin, security, API |

---

## 2. Credentials checklist

Store every item in the company password manager. Do not keep production secrets in
the repository, chat or personal notes.

- [ ] Domain registrar login + recovery email
- [ ] DNS provider login
- [ ] Hosting provider login and SSH keys
- [ ] Database superuser and application user passwords
- [ ] `AUTH_SECRET` (32+ bytes)
- [ ] Paystack dashboard login, public key, secret key, webhook secret
- [ ] SMTP username/password and sending domain DNS access
- [ ] GitHub organisation owner access and repository admin
- [ ] Google Play Console owner access
- [ ] Android keystore file + alias + password (offline, two copies)
- [ ] Backup storage credentials
- [ ] Company support inbox credentials

**Session invalidation:** rotating `AUTH_SECRET` signs out every user. It does not
change passwords. Use it if a token or environment file is exposed.

---

## 3. Source code handover

```bash
git clone https://github.com/Nwite200/brave-skill-project.git
cd brave-skill-project
npm ci
cp .env.example .env    # fill in production values
npx prisma migrate deploy
npm run build
npm start
```

The repository includes:

- full web application source;
- Prisma schema, migration and seed;
- Flutter Android source in `mobile/`;
- brand assets and generation script;
- deployment, admin, security and API documentation;
- backup, restore and QA scripts.

`.env` is **not** included. The company must retain its own copy in the password
manager.

---

## 4. Android distribution ownership

- The signed APK is published under **Admin → Website → Android app** and served from
  the academy domain.
- The App Bundle (`.aab`) is uploaded to the company's Google Play Console.
- Keep every released `.aab` and its mapping file in a company archive.
- The signing key must never be regenerated casually: Play App Signing can manage the
  app signing key, but the upload key must remain in company custody.
- Play Store listing copy, screenshots and declarations are in `docs/PLAY-STORE.md`.

---

## 5. Operational responsibilities

| Frequency | Task | Owner |
| --- | --- | --- |
| Daily | Check contact inbox, pending orders, health endpoint | Academy operations |
| Weekly | Publish announcements, review progress, export revenue | Academy operations |
| Monthly | Verify backups, reconcile Paystack settlements, review audit logs | Finance + operations |
| Quarterly | Dependency updates, access review, restore rehearsal | Technical lead |
| Yearly | Domain renewal, Play policy review, privacy policy review | Company director |

---

## 6. Support boundaries

The delivered system includes:

- the complete web platform and admin console;
- payment integration and verified fulfilment;
- protected media delivery;
- certificate generation and public verification;
- Flutter source code, build instructions and Play Store materials;
- deployment documentation and operational scripts.

Third-party costs (hosting, domain, Paystack fees, Google Play registration, SMS/email
providers) are the company's responsibility.

---

## 7. Acceptance sign-off

| Item | Accepted by | Date |
| --- | --- | --- |
| Website and student portal | | |
| Administrator console | | |
| Paystack live payments + webhook | | |
| Certificates and verification | | |
| Android APK / Play listing | | |
| Source code and credentials handover | | |
| Backup and restore rehearsal | | |

**Company representative:** ______________________________

**Technical representative:** ______________________________

**Date:** ______________________________
