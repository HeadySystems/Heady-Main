# HeadyWeb UI/Auth Fix Summary

**Date:** 2026-03-10
**Branch:** `fix/ui-auth-audit-pass1`
**Files changed:** `src/firebase.js`, `src/App.jsx`, `src/heady-knowledge.js`, `public/favicon.svg`

## Changes Implemented

### 1. Env-only Firebase config with demo-mode fallback (A1, A9)
- **`src/firebase.js`**: Removed all hardcoded placeholder credentials. Firebase now requires `VITE_FIREBASE_*` env vars. If absent, app runs in demo mode with clear console messaging.
- Exported `isFirebaseConfigured` boolean so UI can react.
- **`src/App.jsx`**: When Firebase is unconfigured, the Sign In button is replaced with a "Demo Mode" badge. Status bar shows "Demo Mode" indicator.

### 2. Sign-out UI (A2)
- Added sign-out icon (`Icons.signout`) and button inside the user info pill on the new-tab page.
- `NewTabPage` now receives `onSignOut` prop; `App` passes `handleSignOut` which calls `logOut()` and clears user state.

### 3. Client-side email/password validation (A4, A5)
- `AuthModal.handleEmail` now validates before submitting to Firebase:
  - Empty email/password checks
  - Email format regex validation
  - Password minimum 6 characters (on signup only)
  - Hint text shown under password field during signup
- Removed Cloudflare Turnstile placeholder div (was fake sitekey).
- Added `noValidate` on form, `role="alert"` on error, `autoComplete` attributes.

### 4. Unified ecosystem link lists (D1, D2, D3)
- Created single `ECOSYSTEM_SITES` array at module scope with all ecosystem sites including Heady Docs.
- `BookmarksBar` now derives from `ECOSYSTEM_SITES` (filters out Google/GitHub, takes first 6).
- `NewTabPage` quick tiles use `ECOSYSTEM_SITES.slice(0, 8)`.
- `HeadyBrainResults` "Related Heady Services" section uses `ECOSYSTEM_SITES` instead of a separate hardcoded list.

### 5. Docs/Help entry point (F1, F2)
- Added "Docs & Help" button with help icon on the new-tab page, linking to `docs.headysystems.com`.
- Added docs/help knowledge base entry in `heady-knowledge.js` with keywords: `docs`, `documentation`, `help`, `guide`, `getting started`, `tutorial`, `api docs`.

### 6. favicon.svg (D5)
- Created `public/favicon.svg` — rounded-rect dark background with the ✦ glyph in a blue-to-purple gradient. Matches the HeadyWeb brand.

### 7. Accessible labels on icon-only buttons (E1, E2)
- All `<button>` elements with only an `<Icon>` child now have `aria-label` attributes.
- Affected: Back, Forward, Refresh, Shield, HeadyBuddy, Settings, New Tab, Close Tab, Close Sidebar, Send message, Sign out.
- `Icon` component now renders `aria-hidden="true"` and `focusable="false"` by default.
- Decorative emoji spans marked with `aria-hidden="true"`.
- Bookmark links and quick tiles have `aria-label` with name + description.
- TabBar has `role="tablist"`, tabs have `role="tab"` and `aria-selected`.
- Modals have `role="dialog"` and `aria-modal="true"`.
- Sacred Geometry canvas has `aria-hidden="true"`.

### 8. Tab state race condition fix (B4, B5)
- `newTab`: Uses functional `setTabs` updater; `setActiveTab` is called inside with `next.length - 1` instead of stale `tabs.length`. Removed `tabs.length` from dependency array.
- `closeTab`: Uses functional `setTabs` updater with nested functional `setActiveTab`. Removed `tabs.length` from dependency array.

### Additional fixes
- `saveUserProfile` (A8): `createdAt` is now only set on first write (checks `snap.exists()`), preventing overwrite on repeat Google sign-ins.
- `AuthModal`: Clears error when switching between sign-in/sign-up modes.

## Build
- `vite build` succeeds: 517KB JS, 22KB CSS, 45 modules.
- No test suite exists in the project.
