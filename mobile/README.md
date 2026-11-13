# Brave Skill Academy — Android

Flutter client for the Brave Skill learning platform.

- Package: `ng.com.emyphilltech.braveskill`
- Backend: the same API as the website
- Full build, signing and Play Store instructions: [`../docs/ANDROID.md`](../docs/ANDROID.md)

## Quick start

```bash
flutter pub get
flutter run --dart-define=API_BASE=http://10.0.2.2:3000
```

Production build:

```bash
flutter build apk --release --dart-define=API_BASE=https://academy.emyphilltech.com.ng
```

The app is a consumption experience for courses purchased on the academy website.
It does not link to checkout or process payments.

© Emyphill-Tech Global Solutions Limited.
