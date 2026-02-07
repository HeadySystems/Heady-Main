# UNIVERSAL CONNECTIVITY STRATEGY
## HCFullPipeline Protocol 05

### 1. STRATEGY: "ONE BRAIN, MANY PORTALS"
HeadyBuddy is not an app; it is a **Ubiquitous Intelligence Layer**. It must be available instantly, everywhere, with zero friction.

### 2. CONNECTION VECTORS
#### A. The "Copy-Paste" Widget (Low Friction)
*   **Target:** Blogs, Partner Sites, Personal Portfolios.
*   **Tech:** A 5KB JavaScript snippet (`<script src="heady-buddy.js">`).
*   **Function:** Renders a floating bubble. Opens an iframe to the Chat Interface.
*   **Context:** Can read the current page text to answer questions about *that* specific site.

#### B. The Browser Extension (High Integration)
*   **Target:** Power Users, You (The Founder).
*   **Tech:** Chrome/Edge/Firefox Extension (Manifest V3).
*   **Function:**
    *   **Side Panel:** Persistent companion while browsing.
    *   **Context:** Reads email drafts, calendar pages, and Jira tickets to offer specific help.
    *   **Action:** Can insert text/summaries directly into DOM input fields.

#### C. The "Everywhere" API (Deep Integration)
*   **Target:** Developers, Enterprise.
*   **Tech:** REST + WebSocket.
*   **Endpoints:**
    *   `POST /v1/chat/completions` (OpenAI compatible).
    *   `POST /v1/tasks/plan` (Monte Carlo engine).
*   **SDKs:** Python (`pip install headybuddy`), Node (`npm i headybuddy`).

#### D. Native Mobile (Life Companion)
*   **Target:** Daily driving.
*   **Tech:** React Native or Flutter.
*   **Focus:** Voice Mode (Walking), Push Notifications, Share Sheet integration (Share URL to HeadyBuddy).

### 3. THE "SEAMLESS" PROTOCOL
1.  **Unified Session:** A user logged into the Extension is auto-logged into the Widget and Web App.
2.  **Real-Time Sync:** A task added via Voice on Mobile appears instantly on the Desktop Browser Extension sidebar (via WebSockets).
3.  **Context Handover:**
    *   *Mobile:* "Remind me to read this when I get to my desk."
    *   *Desktop:* (Upon sitting down) "Here is that article you saved from mobile."

### 4. BUILD ORDER (PRIORITY)
1.  **Web Widget:** Easiest to deploy, instant value for your own sites.
2.  **Browser Extension:** Critical for "Overlay" experience and scraping context.
3.  **Mobile App:** Essential for Voice and Notifications.
4.  **Public API:** Later phase for ecosystem growth.

### 5. IMPLEMENTATION CHECKLIST
*   [ ] Build `packages/widget` (Vanilla JS loader).
*   [ ] Build `apps/extension` (React + CRXJS).
*   [ ] Ensure `heady-manager.js` supports CORS for specific domains.
*   [ ] Implement WebSocket server for "Fan-out" updates.
