# Architecture and Implementation Notes

This document explains how `usury-app` works internally so engineers and coding agents can make safe changes.

## 1) High-Level Architecture

The app is a client-only React SPA with a local persistence layer.

- UI layer: React components under `src/components`
- Orchestration layer: `src/App.jsx`
- Domain/persistence layer: `src/utils/loanManager.js`
- Platform wrapper: Capacitor Android project under `android/`

No server, API, or database is currently part of the architecture.

## 2) Startup and Data Hydration

- Browser loads `index.html`, then `src/main.jsx`.
- `main.jsx` mounts `<App />` in React StrictMode.
- `App.jsx` initializes `loans` from `getLoans()` in state initializer.
- `getLoans()` reads and parses `localStorage.getItem("usuryLoans")`.

Important: `getLoans()` assumes valid JSON and has no parse fallback, so malformed storage can throw.

## 3) State Ownership and Component Boundaries

`App.jsx` owns global app state:

- `loans`: all loan records
- `isAddingLoan`: controls add modal visibility
- `activePaymentModal`: `{ show, loan, isSettle }`
- `activeDeleteModal`: `{ show, loan }`
- `activeLoanDetailsId`: selected loan for full details modal

`Dashboard.jsx` owns display-only controls:

- active tab (`ACTIVE` or `DONE`)
- selected month and year for summary

Pattern used:

- `App` passes callbacks into child components.
- Child components request actions; only `App` writes to state.
- All writes eventually flow through `loanManager.js`.

## 4) Domain Logic in `loanManager.js`

### Storage key

- Constant key used directly: `usuryLoans`

### ID generation

- `generateId()` uses `Math.random().toString(36).substr(2, 9)`
- Fast and simple, but not collision-proof.

### Loan create logic

- Input: `{ name, startDate, principal, interestPerWeek, proofImage? }`
- Computes `nextPaymentDate` as start + 7 days
- Creates loan:
  - `status: "ACTIVE"`
  - `payments: []`
- If provided, stores `proofImage` object with compressed image metadata.
- Saves and returns fresh full list.

### Payment logic

`collectPayment(loanId, amount, isFullSettlement)`:

- Finds loan by `id`
- Adds payment object with current ISO timestamp
- If settlement:
  - set `status = "DONE"`
- Else:
  - increment `nextPaymentDate` by 7 days
- Saves and returns list.

### Delete logic

- Filters out target `id`, saves, returns list.

### Derived calculations

- `calculateDaysLeft(nextPaymentDateIso)`: day-level difference from today
- `getAvailableYears(loans)`: years from payment history + current year
- `getSummaryStats(loans, selectedYear, selectedMonth)`:
  - active principal total
  - all-time interest total
  - selected month interest total

## 5) UI Modules and Responsibilities

- `Dashboard.jsx`
  - Computes/filter/sort for displayed loans
  - Renders summary cards and month/year selectors
  - Tabbed list: active vs done
- `LoanCard.jsx`
  - Renders each loan
  - Overdue highlighting and Bengali date/day text
  - Actions: interest payment, settlement, delete
  - Card tap opens full details modal
- `LoanDetailsModal.jsx`
  - Shows full loan details and payment history
  - Shows optional proof image
  - Supports proof download as JPG
- `AddLoanForm.jsx`
  - Captures new loan fields
  - Auto-suggests weekly interest = `Math.floor(principal * 0.1)`
  - Converts chosen date into Dhaka timezone date string (`YYYY-MM-DD`) before save
  - Supports optional proof image from camera/gallery
  - Opens `DocumentCropModal` before final save
- `PaymentModal.jsx`
  - Supports partial mode (weekly interest) and full-settlement mode
- `DeleteModal.jsx`
  - Dangerous action confirmation
- `DocumentCropModal.jsx`
  - Free-form corner-resize crop UI
  - Allows "use without crop" option
- `LiveClock.jsx`
  - 1-second ticking Bengali date/time for `Asia/Dhaka`

## 6) Timezone and Date Behavior

Date handling is mixed but deliberate:

- New loan `startDate` is stored as `YYYY-MM-DD` (Dhaka-normalized in add form).
- Payment dates and next payment dates use full ISO timestamps.
- Display converts using Bengali locale and JS Date behavior.

Potential effect:

- Around timezone boundaries, date-only and ISO date interactions can be sensitive.
- If you refactor date logic, test around midnight and month boundaries.

## 7) Styling System

- Main style file: `src/index.css`
- Contains:
  - design tokens
  - layout utilities
  - modal styles
  - responsive behavior
  - `react-datepicker` overrides
  - crop modal / proof image styles

## 8) Android Wrapper and Build Chain

Important files:

- `capacitor.config.json` (`webDir: dist`, `appId: com.dena.app`)
- `android/app/build.gradle` (`applicationId: com.dena.app`)
- `android/app/src/main/java/com/dena/app/MainActivity.java`
- `android/app/src/main/AndroidManifest.xml`

Build logic:

- Build web assets into `dist`
- Sync Capacitor assets/plugins into Android project
- Compile APK via Gradle

CI automation:

- `.github/workflows/build-android.yml` builds signed release APK and uploads artifact `Dena-Android-v<versionName>-<versionCode>`.

## 9) External Dependencies and Integrations

- Google Fonts from `fonts.googleapis.com` and `fonts.gstatic.com`
- Capacitor native runtime
- `react-image-crop` for document-proof cropping UX
- `react-easy-crop` (installed dependency for image handling stack)
- No remote API integrations in current code
- Optional Google Services plugin in Gradle if `google-services.json` exists

## 10) Testing and Quality Status

- JavaScript/React tests are not configured.
- Root `package.json` has no `test` script.
- Only default Android template tests exist.
- ESLint is active and should be run on edits.

## 11) Current Risks / Technical Debt

- Inconsistent identifiers:
  - Android test package uses `com.getcapacitor.myapp` while app ID is `com.dena.app`
- `README.md` may lag behind newer feature updates unless maintained each release
- `getLoans()` has no safe recovery for corrupted localStorage
- Random ID generation without collision guard
- Schema versioning/migrations not implemented

## 12) Safe Change Checklist

When modifying behavior:

1. Update logic in `loanManager.js` first.
2. Confirm dependent component assumptions in `Dashboard`, `LoanCard`, and modals.
3. Verify Bengali display and formatting remains correct.
4. Run `npm run lint`.
5. If native-impacting change, run `npm run build` and `npx cap sync android`.

When changing loan schema:

1. Add backward-compatible reads for old records.
2. Keep old records functional (or provide migration logic).
3. Validate summary calculations still match expectations.

## 13) Recommended Next Improvements

- Add defensive `try/catch` around JSON parse in `getLoans()`.
- Add unit tests for `loanManager` date and stats functions.
- Align package/app IDs and branding (`Dena` vs Bengali product label).
- Replace template `README.md` with real project docs.
- Add missing favicon asset or remove references.
