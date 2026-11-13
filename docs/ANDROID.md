# Android application

**App name:** Brave Skill Academy
**Package:** `ng.com.emyphilltech.braveskill`
**Source:** `mobile/`
**Backend:** the same Next.js API used by the website

The app is a consumption client: learners sign in with the account created on the
academy website and access courses they have already enrolled in. It does not sell
courses or link to external checkout, keeping it compliant with Google Play's
payments policy for digital content purchased elsewhere.

---

## 1. Requirements

- Flutter 3.35+ (built and tested with 3.50, Dart 3.14)
- Android SDK with platform 36/37 and build-tools
- JDK 17 (Android Studio's bundled JBR works)
- A running Brave Skill backend

```bash
export PATH="$HOME/flutter/bin:$PATH"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

---

## 2. Run against a local backend

The API base URL is a compile-time constant. For the Android emulator, the host
machine is `10.0.2.2`:

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE=http://10.0.2.2:3000
```

For a physical device on the same network, use the computer's LAN IP
(`http://192.168.x.x:3000`) and ensure the backend is reachable. Debug builds allow
cleartext HTTP; release builds enforce HTTPS.

Production builds use the default:

```bash
flutter build apk --release --dart-define=API_BASE=https://academy.emyphilltech.com.ng
```

---

## 3. What the app includes

| Screen | Behaviour |
| --- | --- |
| Animated splash | Same neon ring/logo identity as the website; respects reduce-motion |
| Login / register | Session cookie stored securely; students only |
| Discover | Catalogue, search, category filters, programme detail |
| Learning | Enrolled programmes with progress and next lesson |
| Player | Protected video streaming (Range), PDF download/open, text lessons, completion |
| Assessments | Quizzes and final exams with server grading and a countdown timer |
| Certificates | List, download PDF, verification URL |
| Profile | Edit profile, change password, notifications, payment history, receipts, support, privacy, sign out |

The app refreshes the catalogue from the backend on every launch and pull-to-refresh,
so courses published in the admin console appear without an app update.

### Media handling

- Videos stream from `/api/media/[assetId]` with the session cookie as an HTTP header.
- PDFs are downloaded with the cookie, then opened in the device viewer.
- Certificate PDFs are public by serial and can be downloaded directly.

---

## 4. Build the APK

```bash
cd mobile
flutter clean
flutter pub get
flutter build apk --release \
  --dart-define=API_BASE=https://academy.emyphilltech.com.ng
```

Output: `mobile/build/app/outputs/flutter-apk/app-release.apk`

Upload the APK to **Admin → Website → Android app** so it is served from
`https://academy.emyphilltech.com.ng/api/app/download`. Update the version label in
the same section.

### Build the App Bundle for Google Play

```bash
flutter build appbundle --release \
  --dart-define=API_BASE=https://academy.emyphilltech.com.ng
```

Output: `mobile/build/app/outputs/bundle/release/app-release.aab`

---

## 5. Release signing (company custody)

Create the upload keystore **once**, in company custody:

```bash
keytool -genkey -v -keystore ~/brave-skill-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias braveskill
```

Create `mobile/android/key.properties` (gitignored):

```properties
storePassword=...
keyPassword=...
keyAlias=braveskill
storeFile=/absolute/path/to/brave-skill-upload.jks
```

Then rebuild. The Gradle configuration automatically uses the release keystore when
this file exists, and falls back to debug signing for local builds otherwise.

**Never commit** the keystore, `key.properties`, or their passwords. Store two
encrypted backups offline and the passwords in the company password manager. Losing
the upload key can block updates unless Play App Signing is enabled and the upload key
is reset.

### Verify the signature

```bash
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs \
  mobile/build/app/outputs/flutter-apk/app-release.apk
```

---

## 6. Google Play submission

1. Create the app in the company's Play Console:
   - App name: **Brave Skill Academy**
   - Default language: English (Nigeria)
   - App or game: App; Free
   - Package: `ng.com.emyphilltech.braveskill`
2. Upload the `.aab` to an **internal testing** track first.
3. Complete the declarations:
   - **Privacy policy:** `https://academy.emyphilltech.com.ng/privacy`
   - **App access:** provide a demo student account and instructions
     (email + password) because the app requires sign-in.
   - **Ads:** No.
   - **Content rating:** Education / utility; complete the questionnaire honestly.
   - **Target audience:** 18+ (or 16+), not designed for children.
   - **Data safety:** see `docs/PLAY-STORE.md`.
   - **News app:** No.
   - **COVID-19 contact tracing:** No.
   - **Financial features:** No.
   - **Health:** No.
4. Upload store listing assets: icon, feature graphic, at least 2 phone screenshots
   (recommended 4–8), short and full description.
5. Add release notes and submit for review.

### Payments policy note

Digital courses are purchased on the academy website, outside the app. The app:

- does **not** link to checkout or payment pages;
- does **not** mention prices or prompt users to pay externally;
- only displays content the signed-in learner already has access to.

This keeps the app in the "consumption-only" category. Review Google Play's current
Payments policy before each submission, as rules evolve.

---

## 7. Permissions

| Permission | Why |
| --- | --- |
| `INTERNET` | API, video streaming, PDFs |
| `ACCESS_NETWORK_STATE` | Connection handling |
| `POST_NOTIFICATIONS` | Reserved for future course/payment alerts; no push is sent today |

No location, contacts, camera, microphone, SMS or background tracking.

---

## 8. Testing checklist

- [ ] Splash animation and transition to login.
- [ ] Login with a website account; incorrect password shows a clear error.
- [ ] Registration creates an account and opens the dashboard.
- [ ] Catalogue loads, search and category filters work.
- [ ] Course detail shows curriculum; locked lessons are marked.
- [ ] Purchased course appears after signing in (no app update).
- [ ] Video plays, seeks and marks complete; progress reflects on the website.
- [ ] PDF downloads and opens.
- [ ] Quiz starts, timer counts down, submit grades correctly.
- [ ] Final exam blocked until lessons complete.
- [ ] Certificate downloads and opens; serial matches the website.
- [ ] Notifications and payment history load.
- [ ] Password change and profile edit persist.
- [ ] Sign out returns to login and clears the session.
- [ ] Airplane mode shows a friendly error, not a crash.
- [ ] Rotation, small screens (360dp) and large text do not break layout.

---

## 9. Troubleshooting

| Problem | Fix |
| --- | --- |
| `No Java runtime` | Set `JAVA_HOME` to Android Studio's JBR |
| Gradle cannot download | Check network/proxy; retry `flutter pub get` and build |
| API unreachable on emulator | Use `10.0.2.2`, not `localhost` |
| Cleartext blocked | Debug builds allow HTTP; release requires HTTPS |
| Video 401 | Ensure the learner is signed in and enrolled |
| PDF will not open | Install a PDF viewer; the file is saved in the app cache |
| App still shows old API | Rebuild with the correct `--dart-define=API_BASE` |
