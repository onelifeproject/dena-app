# Android Release Signing Setup

Use this once to make all future APK/AAB updates install over previous versions without package conflict.

## Why this matters

Android accepts app updates only when both are true:

1. Same `applicationId` (currently `com.dena.app`)
2. Same signing key (keystore + alias)

If signing key changes, Android shows package conflict / app not installed.

## No GitHub secrets required (local signing)

This repo now supports local file-based signing for private use.

Create this file on your machine (do not commit it):

- `android/keystore/signing.properties`

Template exists:

- `android/keystore/signing.properties.example`

## Create your keystore once (local)

Run in PowerShell:

```powershell
keytool -genkeypair -v -keystore dena-release.keystore -alias dena -keyalg RSA -keysize 2048 -validity 10000
```

You will choose:

- keystore password
- key alias (`dena` or your chosen alias)
- key password

Save this keystore safely. Never lose it.

## Configure local signing file

Create `android/keystore/signing.properties` using this format:

```properties
storeFile=keystore/dena-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=dena
keyPassword=YOUR_KEY_PASSWORD
```

Then place your keystore file at:

- `android/keystore/dena-release.keystore`

Both are ignored by git.

## Build outputs

GitHub workflow builds debug APK only:

- `Dena-Android-Debug-APK` -> `Dena-debug.apk`

For update-safe production install, build locally with your signing file:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew clean assembleRelease bundleRelease
```

Release outputs:

- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## Versioning rule per release

In `android/app/build.gradle`, always bump:

- `versionCode` by +1 each release
- `versionName` as semantic version (`1.1.1`, `1.2.0`, etc.)

Do not change `applicationId` after public install.
