# Dena (`usury-app`)

বাংলা UI-ভিত্তিক লোন ও মুনাফা হিসাবের অ্যাপ।  
Web এবং Android—দুই জায়গাতেই চলে।

## PC-তে কী কী software লাগবে

- `Node.js` (LTS, ভাল হলে 22+)
- `npm` (Node এর সাথে থাকে)
- `Java JDK 21` (Android Gradle build এর জন্য)
- `Android Studio` (Android SDK + Build Tools + Platform Tools)
- `Git` (GitHub push/pull এর জন্য)

Windows হলে command চালাতে:

- `PowerShell` বা `CMD`

## কী কী আছে

- নতুন হিসাব, এডিট, মুছুন, পরিশোধিত/চলতি স্ট্যাটাস
- অটো মুনাফা সেটিংস (`5000 -> 500` টাইপ রুল)
- মুনাফা নেওয়ার ব্যবধান (দিন)
- অটো ব্যাকআপ, ম্যানুয়াল ব্যাকআপ, রিস্টোর
- প্রথমবার অ্যাপ খোলার সময় সেটিংস অটো ওপেন
- ছবি আপলোড, ক্রপ, বড় করে দেখা, ডাউনলোড

## লোকাল চালাতে

```bash
npm install
npm run dev
```

## Android build

```bash
npm run android:release
```

APK path:

- `android/app/build/outputs/apk/release/app-release.apk`

Debug build check:

```bash
cd android
gradlew.bat assembleDebug
```

## Version কোথায় বদলাবেন

ফাইল:

- `android/app/build.gradle`

`defaultConfig` এর ভিতরে:

- `versionCode` (প্রতি রিলিজে বাড়াতে হবে)
- `versionName` (যেমন: `2.5`)

## GitHub Actions release

Workflow:

- `.github/workflows/build-android.yml`

Push দিলে:

- signed APK build হয়
- artifact upload হয়
- `versionName` থেকে tag/release হয় (যেমন: `v2.5`)
- APK release asset হিসেবে attach হয়

## ব্যাকআপ সম্পর্কে

- ম্যানুয়াল ব্যাকআপে পুরো অ্যাপ ডেটা JSON ফাইলে সেভ হয়
- রিস্টোর দিলে আগের ডেটা ফেরত আসে
- অটো ব্যাকআপ:
  - Settings থেকে ON/OFF
  - দিন সেট করা যায়
  - Android-এ `WorkManager` দিয়ে background check/run হয়

## দরকারি command

```bash
npm run lint
npm run build
```
