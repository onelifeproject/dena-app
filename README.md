# Dena (`usury-app`)

Loan and weekly-interest tracking app (Bengali UI), built with React + Vite and packaged for Android via Capacitor.

## What's New (2026-04)

- Android back swipe/button now closes open modals first (instead of abruptly exiting app).
- Loan proof images can be saved directly on native Android to `Documents/Dena/`.
- Loan proof image viewer now supports full-screen pinch zoom/pan in:
  - loan details modal
  - add-loan preview modal
- Settled (`পরিশোধিত`) cards now keep only meaningful action (`মুছে ফেলুন`).
- Loan cards and summary cards now include stronger status-based highlight/glow styling.
- Mobile tap/pressed states were refined so rounded buttons stay visually clipped and consistent.

## Run Locally

```bash
npm install
npm run dev
```

## Android Build (Local)

```bash
npm run android:release
```

Release APK output:

- `android/app/build/outputs/apk/release/app-release.apk`
- If you want manual steps instead:
  - `npm run build`
  - `npx cap sync android`
  - `cd android`
  - `gradlew.bat clean assembleRelease`

## Where To Change Version (Important)

Change Android version here:

- `android/app/build.gradle`

Update these fields in `defaultConfig`:

- `versionCode` (must increase every release: 1, 2, 3...)
- `versionName` (human-readable: 1.0, 1.1, 1.2...)

Example:

```gradle
defaultConfig {
    versionCode 5
    versionName "1.4"
}
```

## Release Checklist (Remember This)

1. Bump `versionCode` and `versionName` in `android/app/build.gradle`.
2. Keep `applicationId` unchanged (`com.dena.app`).
3. Ensure signing files exist:
   - `android/keystore/signing.properties`
   - `android/keystore/dena-release.keystore`
4. Run:
   - `npm run lint`
   - `npm run build`
   - `npx cap sync android`
5. Push to GitHub and verify workflow artifact name matches version.

## Notification Notes

- Android small status icon uses monochrome asset (`ic_stat_dena_mono`).
- Notification large icon uses branded asset (`ic_notification_large`).
- Messages and scheduling logic live in `src/services/notificationService.js`.
