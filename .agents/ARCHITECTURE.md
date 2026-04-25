# Architecture and Implementation Notes

This document explains how `dena-app` works internally so engineers and coding agents can make safe changes.

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
- `getLoans()` reads and parses `localStorage.getItem("denaLoans")`.

Important: `getLoans()` assumes valid JSON and has no parse fallback, so malformed storage can throw.

## 3) State Ownership and Component Boundaries

`App.jsx` owns global app state:

- `loans`: all loan records
- `isSettingsOpen`: settings modal visibility
- `isSettingsTestOpen`: settings test panel visibility
- `profitIntervalDraft`: editable profit interval value in settings
- `isAddingLoan`: controls add modal visibility
- `activePaymentModal`: `{ show, loan, isSettle }`
- `activeDeleteModal`: `{ show, loan }`
- `activeLoanDetailsId`: selected loan for full details modal

`Dashboard.jsx` owns display-only controls:

- active tab (`ACTIVE` or `DONE`)
- selected month and year for summary
- defaults to current month/year on app load (selection is not persisted across restart)

Pattern used:

- `App` passes callbacks into child components.
- Child components request actions; only `App` writes to state.
- All writes eventually flow through `loanManager.js`.

## 4) Domain Logic in `loanManager.js`

### Storage key

- Constant key used directly: `denaLoans`
- Settings key: `denaProfitIntervalDays` (default `7`, bounded `1..365`)

### ID generation

- `generateId()` uses `Math.random().toString(36).substr(2, 9)`
- Fast and simple, but not collision-proof.

### Loan create logic

- Input: `{ name, startDate, principal, interestPerWeek, proofImage? }`
- Computes `nextPaymentDate` as start + configured profit interval days
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
  - increment `nextPaymentDate` by configured profit interval days
- Saves and returns list.

### Profit interval setting logic

- `getProfitIntervalDays()` reads `denaProfitIntervalDays` with fallback to `7`.
- `saveProfitIntervalDays(days)` normalizes and persists value.
- `applyProfitIntervalToActiveLoans(days)`:
  - persists the new interval
  - recalculates `nextPaymentDate` for all `ACTIVE` loans immediately
  - uses last payment date (if present) or start date as recalculation anchor

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
  - Actions:
    - `ACTIVE`: interest payment + settlement + delete
    - `DONE`: delete only
  - Card tap opens full details modal
- `LoanDetailsModal.jsx`
  - Shows full loan details and payment history
  - Shows optional proof image
  - Supports proof download as JPG
  - Native save target is `Documents/Dena/` (no share sheet flow)
  - Includes full-screen image viewer with pinch zoom/pan/reset
  - Includes edit action button that opens add form in edit mode
  - Header uses responsive two-row layout: title left, close button fixed top-right, edit button below
- `AddLoanForm.jsx`
  - Captures new loan fields
  - Auto-suggests weekly interest = `Math.floor(principal * 0.1)`
  - Converts chosen date into Dhaka timezone date string (`YYYY-MM-DD`) before save
  - Supports optional proof image from camera/gallery
  - Opens `DocumentCropModal` before final save
  - Includes full-screen zoomable preview for uploaded/cropped proof image
- `PaymentModal.jsx`
  - Supports partial mode (weekly interest) and full-settlement mode
- `DeleteModal.jsx`
  - Dangerous action confirmation
- `DocumentCropModal.jsx`
  - Free-form corner-resize crop UI
  - Allows "use without crop" option
- `LiveClock.jsx`
  - 1-second ticking Bengali date/time for `Asia/Dhaka`
- `NotificationDebugPanel.jsx`
  - now rendered inside Settings modal test section (not logo-tap trigger)

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
  - small-device button safeguards (including `<=360px` compact button sizing)

Footer behavior:

- Footer year text is computed in `App.jsx` from base year `2026` to current year.
- Display uses Bengali digits and range format (for example `২০২৬` or `২০২৬–২০২৮`).

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

Android interaction behavior:

- `@capacitor/app` back-button listener is registered in `App.jsx`.
- Back priority closes overlays in this order:
  1. loan details modal
  2. delete modal
  3. payment modal
  4. add-loan modal
  5. settings modal
  6. restore confirmation modal
- Only when no modal is open, app falls back to navigation/back exit flow.

CI automation:

- `.github/workflows/build-android.yml` builds signed release APK and uploads artifact `Dena-Android-v<versionName>-<versionCode>`.

## 9) External Dependencies and Integrations

- Google Fonts from `fonts.googleapis.com` and `fonts.gstatic.com`
- Capacitor native runtime
- Capacitor App plugin (`@capacitor/app`) for native back button events
- `react-image-crop` for document-proof cropping UX
- `react-easy-crop` (installed dependency for image handling stack)
- `react-zoom-pan-pinch` for touch-first full-screen image viewing
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

## 14) Recent UX/Styling Updates (2026-04)

- Added status-specific glow and animated sweep effects for loan cards.
- Added highlighted summary stat cards (principal/profit emphasis).
- Refined mobile tap behavior so rounded buttons and tabs keep press effects clipped inside shape.
- Reduced mobile false-hover artifacts on touch devices (coarse pointer media queries).
- Added responsive Settings modal and custom restore confirm modal.
- Added responsive safeguards for small-device buttons (including settings/test panels).
- Updated loan details modal header responsiveness and close icon highlight styling.
- Added dynamic Bengali footer copyright year range.

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
