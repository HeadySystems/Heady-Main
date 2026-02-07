# WEBSITE REBUILD BLUEPRINT
## HCFullPipeline Protocol 04

### 1. VISION: THE HEADY ECOSYSTEM
Rebuilding all web properties as nodes in a unified system, not separate silos. All share the same **Design System**, **Auth**, and **Brain**.

### 2. THE SITES (NODES)
1.  **HeadyBuddy Product Site:** The commercial face.
    *   *Goal:* Conversion (Install App/Extension).
    *   *Features:* Interactive Chat Demo, Live Widget.
2.  **HeadyConnection (Non-Profit):** The heart.
    *   *Goal:* Trust & Impact.
    *   *Features:* "Impact Wallet" dashboard, Grant transparency.
3.  **HeadySystems (C-Corp):** The engine.
    *   *Goal:* B2B/Enterprise trust.
    *   *Features:* API Docs, SLA details, Investor Relations.

### 3. TECH STACK (UNIFIED)
*   **Framework:** Next.js (App Router) + TypeScript.
*   **Styling:** Tailwind CSS + "Sacred Geometry" Token System (Phi-based spacing).
*   **Components:** Shared `packages/ui` library.
*   **Content:** MDX for docs, Sanity/Contentful for marketing pages.
*   **Analytics:** PostHog (Privacy-focused).

### 4. IMPLEMENTATION STAGES
#### Phase 1: Foundation
*   Create `packages/ui` with the Design System (Colors, Typography, Buttons, Cards).
*   Set up Monorepo structure (TurboRepo or Nx).
*   Deploy empty Next.js shells for all 3 domains.

#### Phase 2: HeadyBuddy (The Product)
*   Build the "Live Demo" wrapper.
*   Implement `InstallButton` that detects OS/Browser.
*   Create Docs/Help center.

#### Phase 3: The Integrations
*   **HeadyConnection:** Pull real-time "Time Saved" metrics from the App DB to display on the landing page.
*   **HeadySystems:** Integrate Stripe for subscriptions and API key management.

### 5. SHARED COMPONENTS
*   **Nav/Footer:** Unified branding across all sites.
*   **The Widget:** The `HeadyBuddyWidget` component is embedded in ALL sites.
    *   *HeadyConnection:* Answers questions about mission.
    *   *HeadySystems:* Answers technical API questions.
    *   *Product Site:* Demos the product itself.

### 6. CI/CD PIPELINE
*   **Commit:** Lint + Typecheck.
*   **Preview:** Vercel Preview Deployments for every PR.
*   **Test:** Playwright E2E tests for critical flows (Signup, Donate).
*   **Deploy:** Auto-deploy to Production on merge to `main`.
