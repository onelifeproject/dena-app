# Dena (`usury-app`)

Loan and weekly-interest tracking app (Bengali UI), built with React + Vite and packaged for Android via Capacitor.

## What's New (2026-04)

- Settings now opens automatically once on first install/run.
- Auto Munafa settings:
  - principal -> munafa rule (example: `5000 -> 500`)
  - munafa interval days
  - highlighted saved-status note
- Settings split into clear cards:
  - Auto Backup
  - Manual Backup
  - Restore
  - Test Options
- Backup payload now captures full app state:
  - all loans (active + done + payment history)
  - munafa settings
  - backup settings
  - dashboard filters (tab/year/month)
  - first-run flag
  - last backup timestamps
- Auto backup upgrades:
  - in-app auto backup (web + native behavior)
  - Android WorkManager background scheduling for closed-app periodic backup checks
- Manual backup card now shows last manual backup time.
- UI consistency updates:
  - Bangla wording standardized to `মুনাফা`
  - all close icons unified
- Performance optimization:
  - heavy modals now lazy-loaded (smaller initial JS bundle).

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

Debug build check:

```bash
cd android
gradlew.bat assembleDebug
```

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
   - `cd android && gradlew.bat assembleDebug`
5. Push to GitHub and verify workflow artifact name matches version.

## Backup & Restore Behavior

- Manual backup creates JSON backup file with full app state.
- Restore replaces current app state using selected backup file.
- Auto backup:
  - can be enabled/disabled from Settings
  - interval days is configurable
  - Android uses background WorkManager checks for due backups
  - web uses local snapshot for auto mode (browser auto-download limits)

## JDK/Gradle Note (Windows)

If Android Gradle build fails with `Unsupported class file major version`, use JDK 21 for Gradle daemon.

- Project is configured via `android/gradle.properties`:
  - `org.gradle.java.home=...jdk-21...`

## Notification Notes

- Android small status icon uses monochrome asset (`ic_stat_dena_mono`).
- Notification large icon uses branded asset (`ic_notification_large`).
- Messages and scheduling logic live in `src/services/notificationService.js`.
