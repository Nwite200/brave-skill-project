# Google Play listing pack

Use this document to complete the Play Console listing and declarations.

---

## App identity

| Field | Value |
| --- | --- |
| App name | Brave Skill Academy |
| Package name | `ng.com.emyphilltech.braveskill` |
| Developer name | Emyphill-Tech Global Solutions Limited |
| Contact email | support@academy.emyphilltech.com.ng |
| Website | https://academy.emyphilltech.com.ng |
| Privacy policy | https://academy.emyphilltech.com.ng/privacy |
| Category | Education |
| Tags | Learning, Skills, Vocational training |
| Pricing | Free to install |

---

## Short description (max 80 characters)

```
Practical technical skills. Learn, practise and earn verifiable certificates.
```

Alternate:

```
Solar, CCTV, electrical, networking and access control training on the go.
```

---

## Full description

```
Brave Skill Academy is the mobile learning companion for Brave Skill — a practical skill acquisition academy operated by Emyphill-Tech Global Solutions Limited.

Learn the technical skills that get you hired, paid and trusted across Nigeria. Stream your enrolled lessons, read field guides, take assessments and carry your verifiable certificates anywhere.

WHAT YOU CAN DO
• Continue video lessons with progress that syncs with the website
• Download and read PDF field guides on site
• Take quizzes and timed final assessments
• Earn serial-numbered certificates that clients and employers can verify
• Track your progress across every programme
• View payment history and download receipts
• Receive course, payment and certificate notifications

PROGRAMMES
• Solar Installation and Inverter Technology
• CCTV Installation and Configuration
• Electrical Installation and Maintenance
• Networking and Fiber Optics
• Intercom and Access Control

WHO IT IS FOR
Aspiring technicians, electricians expanding their services, IT and security installers, facility managers and entrepreneurs building practical income skills.

HOW IT WORKS
Create your account on academy.emyphilltech.com.ng, enrol in a programme, then sign in here with the same account. Your courses, progress and certificates appear automatically. Courses are purchased through the academy website; the app is a learning companion for programmes you already have access to.

LEARN. PRACTICE. BUILD.
```

---

## Graphics checklist

| Asset | Requirement | File |
| --- | --- | --- |
| App icon | 512 × 512 PNG, 32-bit, no transparency | `public/brand/icon-512.png` (1024 master in `icon-1024.png`) |
| Feature graphic | 1024 × 500 PNG/JPEG | `public/brand/play-feature-graphic.png` |
| Phone screenshots | 2–8, 16:9 or 9:16, min 1080px | Capture from the running app |
| Tablet screenshots | Optional | — |
| Promo video | Optional YouTube URL | — |

Captured screenshots (1080 × 1920, portrait) are included in
[`docs/assets/play/`](assets/play/):

1. `01-discover.png` — Discover / catalogue.
2. `02-programme.png` — Programme detail with access and curriculum.
3. `03-lesson.png` — Video lesson player.
4. `04-learning.png` — Learning progress.
5. `05-certificate.png` — Verifiable certificate.
6. `06-profile.png` — Student profile.

A Play feature graphic and 512px icon are in `public/brand/`. Replace or add
screenshots after major UI changes; keep personal data out of store images.

---

## Store settings

- **App category:** Education
- **Contact details:** support email + website
- **External marketing:** opt in if desired
- **Content rating questionnaire:**
  - Violence, sexuality, language, controlled substances: No
  - User-generated content / social features: No
  - Shares location: No
  - Digital purchases: No (content is purchased outside the app)
  - Expected rating: Everyone / PEGI 3
- **Target audience:** 18+ (adults seeking vocational training). If selecting 13–17,
  ensure the listing and privacy policy are appropriate for teens.
- **Ads:** No.
- **App access:** Restricted. Provide:
  - Username: a stable demo student account created for review
  - Password: the account password
  - Instructions: “Sign in to view enrolled courses. Programmes are purchased on the academy website; this app provides access to content already enrolled.”
- **Government app:** No.
- **Financial features:** No.
- **Health:** No.

---

## Data safety declaration

| Question | Answer |
| --- | --- |
| Does the app collect or share user data? | Yes — collect; no sharing for advertising |
| Data types collected | Name, email, phone (optional), user IDs, course progress, quiz results, purchase history, app interactions, AI assistant conversation text, voice audio processed by the device speech service when the user chooses the microphone |
| Data shared with third parties | Paystack is used on the website for payments; the app does not transmit payment data. No advertising SDKs. |
| Is data encrypted in transit? | Yes (HTTPS) |
| Can users request deletion? | Yes, via support@academy.emyphilltech.com.ng |
| Data collected for advertising? | No |
| Data collected for analytics? | No third-party analytics |
| Purpose | App functionality, account management, education records |

> Review the answers against the final build. If analytics or crash reporting is added
> later, update this declaration.

---

## Content and policy notes

- The app does not sell digital content, link to checkout, or steer users to an
  external payment page. It is a consumption client for learners who enrolled on the
  academy website.
- No ads, no in-app purchases, no subscriptions, no gambling, no user-generated
  content, no chat, no location access.
- The app displays technical training content. Include a safety note in the listing or
  app description if required by review.
- Certificates are training credentials issued by the academy, not government licences.

---

## Release notes

### 1.1.0 (version code 2)

```
Brave AI Assistant is here.

• Ask about courses, prices and requirements by voice or text
• Get spoken answers with a natural academy voice
• Check your progress, payments and certificate eligibility
• Escalate to a human with a support ticket reference
• Same account, same progress, on web and Android
```

### 1.0.0 (version code 1)

```
Brave Skill Academy

• Browse the Brave Skill programme catalogue
• Stream lessons and download field guides
• Track progress that syncs with the website
• Take quizzes and final assessments
• Download verifiable certificates
• Manage your profile and view payment history
```

---

## Review submission checklist

- [ ] `.aab` signed with the company upload key
- [ ] Version code incremented in `mobile/pubspec.yaml`
- [ ] App icon and feature graphic uploaded
- [ ] At least 4 phone screenshots uploaded
- [ ] Short and full descriptions pasted
- [ ] Privacy policy URL live
- [ ] Data safety form completed
- [ ] Content rating questionnaire completed
- [ ] Demo account credentials supplied under App access
- [ ] Internal testing completed on at least two devices
- [ ] Production access requested
- [ ] Store listing reviewed for unverifiable claims

---

## Post-launch

- Monitor crash reports and reviews weekly.
- Reply to reviews from the company account.
- Update the app when the API or brand changes; keep version codes increasing.
- Never upload a build signed with a different key unless Play App Signing and the
  upload-key reset process are used.
