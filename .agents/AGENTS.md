# AGENTS Guide for `usury-app`

This file is the first-stop context for any LLM agent working in this repository.

## Project Purpose

`usury-app` is a React + Vite single-page app for tracking interval-based interest loans in Bengali.
It runs as:

- a web app in browser, and
- an Android app via Capacitor WebView wrapper.

There is no backend API. All business data is stored in browser/app `localStorage`.

## Tech Stack

- Frontend: React 19, Vite 8
- Native shell: Capacitor 8 (`@capacitor/core`, `@capacitor/android`)
- Native app lifecycle: `@capacitor/app` (Android back-button interception)
- Android background scheduler: `androidx.work:work-runtime` (WorkManager)
- Date input: `react-datepicker`
- Image handling: `react-image-crop`, `react-easy-crop`
- Image zoom/pan viewer: `react-zoom-pan-pinch`
- Linting: ESLint flat config
- CI: GitHub Actions builds signed Android release APK

## Canonical Runtime Flow

1. `index.html` loads `/src/main.jsx`.
2. `src/main.jsx` renders `<App />`.
3. `src/App.jsx` loads saved loans from `getLoans()`.
4. User actions (add/payment/delete) call functions in `src/utils/loanManager.js`.
5. Optional proof image flow in add form:
   - pick from camera/gallery
   - optional crop (`DocumentCropModal`)
   - compression (`src/utils/imageCompression.js`)
   - store compressed image metadata in loan record
6. `loanManager.js` mutates loan array and persists to `localStorage` key `usuryLoans`.
7. UI re-renders from state updates in `App.jsx`.

## Repository Map

- `src/`
  - `main.jsx`: React entry
  - `App.jsx`: global state and modal orchestration
  - `components/`: UI modules (`Dashboard`, `LoanCard`, modals, `LiveClock`)
    - `LoanDetailsModal.jsx`: full loan details + proof image + JPG download
    - `DocumentCropModal.jsx`: free crop / skip-crop flow for proof image
  - `utils/loanManager.js`: core business and persistence logic (most critical file)
  - `utils/imageCompression.js`: client-side proof image resizing/compression
  - `index.css`: full app styling
- `public/`: static assets (`icons.svg`)
- `android/`: Capacitor Android project (Gradle, resources, `MainActivity`)
  - `AutoBackupWorker.java`: periodic background backup worker
  - `BackupWorkScheduler.java`: enqueues unique periodic work
- `.github/workflows/build-android.yml`: Android CI build

## Domain Model (Current Data Contract)

Loan object (stored in `usuryLoans` array):

- `id`: string
- `name`: string
- `startDate`: string (`YYYY-MM-DD`)
- `principal`: number
- `interestPerWeek`: number
- `proofImage`: optional object
  - `dataUrl`: compressed image payload
  - `mimeType`: stored image MIME type (currently `image/webp`)
  - `width`: compressed width
  - `height`: compressed height
  - `originalName`: original picked filename
- `status`: `"ACTIVE"` or `"DONE"`
- `nextPaymentDate`: ISO datetime string
- `payments`: array of payment entries

Settings and UI state values (stored separately):

- `usuryProfitIntervalDays`: number (default `7`)
- `usuryProfitPreset`: object `{ principal, interest }` (default `5000 -> 500`)
- `usuryAutoBackupConfig`: object `{ enabled, intervalDays }` (default `enabled: false`, `intervalDays: 1`)
- `usuryLastAutoBackupAt`: ISO datetime string
- `usuryLastManualBackupAt`: ISO datetime string
- `usuryFirstRunSettingsShown`: `"1"` after first-run settings auto-open is shown
- `usuryDashboardFilters`: object `{ activeTab, selectedYear, selectedMonth }`
- `usuryAutoBackupSnapshot`: web-only local auto-backup JSON snapshot (used instead of auto file download)

Payment entry:

- `date`: ISO datetime string
- `amount`: number
- `type`: `"INTEREST"` or `"SETTLEMENT"`

## Business Rules Implemented

- New loan:
  - `status = ACTIVE`
  - `nextPaymentDate = startDate + configured interval days`
  - `payments = []`
- Interest collection:
  - appends payment type `INTEREST`
  - advances `nextPaymentDate` by configured interval days from current `nextPaymentDate`
- Interval update from Settings:
  - saves `usuryProfitIntervalDays` (1-365, default 7)
  - recalculates all `ACTIVE` loans' `nextPaymentDate` immediately
- Full settlement:
  - appends payment type `SETTLEMENT`
  - sets `status = DONE`
- Dashboard summary:
  - totals active principal from `ACTIVE` loans
  - sums all-time interest from `INTEREST` payments
  - sums monthly interest from selected month/year

## UI and Interaction Notes

- No route system (`react-router` not used).
- Single-screen app with modal overlays.
- Bengali locale display (`bn-BD`) across date/number formatting.
- `LiveClock` uses `Asia/Dhaka` timezone.
- `AddLoanForm` also normalizes selected date to Dhaka timezone before save.
- Loan cards are tappable and open `LoanDetailsModal`.
- Proof image upload is optional and never blocks loan creation.
- Proof download from details modal is exported as JPG (client-side conversion).
- On native Android, back swipe/button now closes open overlays first (details > delete > payment > add-loan), then exits only if no overlay is open.
- Proof download in details modal now performs direct file save (no share sheet) to `Documents/Dena/`.
- Both details modal and add-loan image preview support full-screen image viewer with pinch zoom, pan, double-tap zoom, and reset controls.
- Settled (`DONE`) loan cards intentionally show only delete action (no close/settle action).
- Loan cards and summary stat cards have status-based glow styles and animated lighting sweep.
- Mobile tap/press feedback is tuned to stay clipped inside rounded corners and avoid full-card false press feedback when tapping action buttons.
- Settings is a dedicated responsive modal (opened from footer-area settings button).
- On fresh install / fresh app-data state, Settings modal auto-opens once (first-run guidance).
- Settings includes:
  - Auto Munafa settings (principal -> munafa rule + munafa interval days, saved together)
  - Auto Backup settings (instant toggle on/off, custom interval days)
  - Manual Backup
  - Restore
  - Toggleable notification test options
- Manual Backup card shows last manual backup time for transparency.
- Restore uses in-app confirmation modal (not browser native `confirm`) for consistent responsive UI.
- Loan details header is mobile-optimized: title left, close button pinned top-right, edit button on a separate row.
- Footer copyright year now auto-renders as dynamic Bengali range (`২০২৬`, `২০২৬–২০২৭`, `২০২৬–২০২৮`, ...).
- Bangla wording is standardized around `মুনাফা` (replacing legacy `লাভ` copy).
- Modal close (`×`) controls are visually unified with the highlighted close-button style used in loan details.
- Heavy modal flows are lazy-loaded:
  - `AddLoanForm`
  - `LoanDetailsModal`
  - `DocumentCropModal`
  - shared zoom viewer modal

## Recent Change Log (2026-04)

- Added Android-native back-button handling through `@capacitor/app`.
- Added direct JPG proof save path `Documents/Dena/<loan>-proof-<timestamp>.jpg` for native platform.
- Added image viewer modal interactions in:
  - `src/components/LoanDetailsModal.jsx`
  - `src/components/AddLoanForm.jsx`
- Updated loan-card action behavior:
  - `ACTIVE`: interest + settle + delete
  - `DONE`: delete only
- Added enhanced visual system:
  - active vs done edge highlights on cards
  - animated sweep/light pass on loan cards
  - highlighted summary stat cards
  - unified touch press states for rounded buttons/tabs
- Added loan edit action from details modal (`LoanDetailsModal` -> `AddLoanForm` in edit mode).
- Added responsive Settings modal with:
  - Backup (`dena_YYYY-MM-DD_backup.json`)
  - Restore
  - Configurable profit interval days
  - Notification test panel (moved from logo-tap easter egg)
- Added immediate active-loan due-date recalculation when profit interval changes.
- Refined loan details modal header controls:
  - close icon stays top-right with highlighted border/background
  - edit button has separate responsive row for small screens
- Added auto-updating Bengali footer year range (base year ২০২৬).
- Added editable Auto Munafa preset (`principal -> interest`) and connected it to Add/Edit loan auto-calculation.
- Auto Munafa save now also applies interval-day changes to active loans immediately.
- Added first-run-only Settings modal auto-open via `usuryFirstRunSettingsShown`.
- Added richer Settings feedback: highlighted saved-status text for Auto Munafa values.
- Added Auto Backup configuration:
  - instant toggle save (no extra save button for on/off)
  - custom day interval
  - last auto-backup timestamp display
  - periodic due check and run while app is active
- Added Android WorkManager-based background backup flow:
  - schedules unique periodic worker from `MainActivity`
  - worker reads mirrored backup source/meta from app data
  - writes due backup files with timestamped names
  - keeps battery/RAM impact low via lightweight checks + early exits
- Auto backup/manual backup payload now includes full app state needed for practical restore:
  - loans (ACTIVE + DONE + payment history)
  - munafa settings
  - auto backup settings
  - manual backup timestamp
  - dashboard filter state
  - first-run shown flag
  - last auto-backup timestamp
- Backup and restore settings UI was split into distinct cards:
  - Auto Backup
  - Manual Backup
  - Restore
- Dashboard filters were lifted to App-level persisted state to allow backup/restore continuity.
- Unified close-icon styling across modals and image viewers.
- Optimized initial bundle by lazy-loading heavy modal/viewer code paths.

## Commands

- `npm run dev`: start Vite dev server
- `npm run build`: production build to `dist`
- `npm run preview`: preview build
- `npm run lint`: ESLint
- `npm run android:release`: build + sync + signed release APK (local)

Android packaging flow (local):

1. Ensure signing files exist in `android/keystore/`
2. Run `npm run android:release`
3. Output: `android/app/build/outputs/apk/release/app-release.apk`

## CI Behavior

Workflow: `.github/workflows/build-android.yml` (`Android Signed Release Build`)

- Triggers on push to `main` and `master` (plus manual dispatch)
- Uses Node 22 + Java 21
- Builds web bundle, syncs Capacitor, validates signing files, builds `assembleRelease`
- APK filename format: `Dena-v<versionName>.apk`
- Artifact name format: `Dena-Android-v<versionName>-<versionCode>`

## Known Inconsistencies to Keep in Mind

- App/package ID is now aligned to `com.dena.app` in Android + Capacitor.
- App naming differs between layers (`Dena` vs Bengali title in UI).
- Android test package names (`com.getcapacitor.myapp`) do not match app package.

## Guardrails for Future Agents

- Do not introduce backend/API assumptions unless explicitly requested.
- Preserve existing `localStorage` key (`usuryLoans`) unless adding a migration path.
- Treat `src/utils/loanManager.js` as source of truth for business logic.
- Keep Bengali UX text and locale behavior unless user requests language changes.
- If changing loan schema, update create/read/update paths and backward compatibility.
- After substantive edits, run `npm run lint`.

## Suggested First Read Order for New Agents

1. `src/utils/loanManager.js`
2. `src/App.jsx`
3. `src/components/Dashboard.jsx`
4. `src/components/LoanCard.jsx`
5. `src/components/LoanDetailsModal.jsx`
6. `src/components/AddLoanForm.jsx`
7. `src/components/DocumentCropModal.jsx`
8. `src/utils/imageCompression.js`
9. `.github/workflows/build-android.yml`
10. `android/app/build.gradle`

## Where to Find Detailed Design Notes

Read `.agents/ARCHITECTURE.md` for deeper implementation details, extension guidance, and risk list.
