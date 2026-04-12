# AGENTS Guide for `usury-app`

This file is the first-stop context for any LLM agent working in this repository.

## Project Purpose

`usury-app` is a React + Vite single-page app for tracking weekly-interest loans in Bengali.
It runs as:

- a web app in browser, and
- an Android app via Capacitor WebView wrapper.

There is no backend API. All business data is stored in browser/app `localStorage`.

## Tech Stack

- Frontend: React 19, Vite 8
- Native shell: Capacitor 8 (`@capacitor/core`, `@capacitor/android`)
- Date input: `react-datepicker`
- Linting: ESLint flat config
- CI: GitHub Actions builds Android debug APK

## Canonical Runtime Flow

1. `index.html` loads `/src/main.jsx`.
2. `src/main.jsx` renders `<App />`.
3. `src/App.jsx` loads saved loans from `getLoans()`.
4. User actions (add/payment/delete) call functions in `src/utils/loanManager.js`.
5. `loanManager.js` mutates loan array and persists to `localStorage` key `usuryLoans`.
6. UI re-renders from state updates in `App.jsx`.

## Repository Map

- `src/`
  - `main.jsx`: React entry
  - `App.jsx`: global state and modal orchestration
  - `components/`: UI modules (`Dashboard`, `LoanCard`, modals, `LiveClock`)
  - `utils/loanManager.js`: core business and persistence logic (most critical file)
  - `index.css`: full app styling
  - `App.css`: legacy template CSS (currently unused)
- `public/`: static assets (`icons.svg`)
- `android/`: Capacitor Android project (Gradle, resources, `MainActivity`)
- `.github/workflows/build-android.yml`: Android CI build

## Domain Model (Current Data Contract)

Loan object (stored in `usuryLoans` array):

- `id`: string
- `name`: string
- `startDate`: string (`YYYY-MM-DD`)
- `principal`: number
- `interestPerWeek`: number
- `status`: `"ACTIVE"` or `"DONE"`
- `nextPaymentDate`: ISO datetime string
- `payments`: array of payment entries

Payment entry:

- `date`: ISO datetime string
- `amount`: number
- `type`: `"INTEREST"` or `"SETTLEMENT"`

## Business Rules Implemented

- New loan:
  - `status = ACTIVE`
  - `nextPaymentDate = startDate + 7 days`
  - `payments = []`
- Interest collection:
  - appends payment type `INTEREST`
  - advances `nextPaymentDate` by +7 days from current `nextPaymentDate`
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

## Commands

- `npm run dev`: start Vite dev server
- `npm run build`: production build to `dist`
- `npm run preview`: preview build
- `npm run lint`: ESLint

Android packaging flow:

1. `npm run build`
2. `npx cap sync android`
3. Build in `android/` with Gradle (`assembleDebug`)

## CI Behavior

Workflow: `.github/workflows/build-android.yml`

- Triggers on push to `main` and `master` (plus manual dispatch)
- Uses Node 22 + Java 21
- Builds web bundle, syncs Capacitor, builds APK
- Renames output to `Dena.apk`
- Uploads artifact `Dena-Android`

## Known Inconsistencies to Keep in Mind

- Capacitor `appId` is `com.dena.app`, but Android package/application ID is `com.usury.app`.
- App naming differs between layers (`Dena` vs Bengali title in UI).
- `index.html` and `App.jsx` reference `/favicon.png`, but favicon file is not present.
- `README.md` is still generic Vite template text.
- Android test package names (`com.getcapacitor.myapp`) do not match app package.
- `src/App.css` is unused.

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
5. `src/components/AddLoanForm.jsx`
6. `.github/workflows/build-android.yml`
7. `android/app/build.gradle`

## Where to Find Detailed Design Notes

Read `.agents/ARCHITECTURE.md` for deeper implementation details, extension guidance, and risk list.
