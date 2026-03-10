---
name: heady-perplexity-computer-use
description: Orchestrates Perplexity Computer use sessions for the Heady platform. Use when the user asks to automate browser tasks, perform web interactions, take screenshots, fill forms, navigate websites, or run computer-use workflows via Perplexity. Triggers on phrases like "browse the web", "take a screenshot of", "fill out the form at", "automate the website", "use computer to", or "navigate to and do".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: automation
---

# Heady Perplexity Computer Use

## When to Use This Skill

Use this skill when the user asks to:

- Automate interactions with websites or desktop applications
- Take screenshots of specific web pages or UI states
- Fill out and submit web forms
- Extract structured data from dynamically rendered pages
- Chain multi-step browser workflows (login → navigate → extract → submit)
- Monitor page state changes over time
- Perform accessibility audits of live sites
- Simulate user journeys for QA and testing

## Concepts

**Computer Use** refers to AI-driven control of a web browser or desktop environment. In the Heady/Perplexity context, computer use sessions follow a screenshot → analyze → act → verify loop.

**Session State** is the persistent context between actions: cookies, local storage, open tabs, and scroll position are all part of session state and must be maintained across steps.

## Instructions

### 1. Session Initialization

Before performing any actions:
1. Capture a full-page screenshot of the target URL to establish baseline state.
2. Identify interactive elements: buttons, links, input fields, dropdowns, modals.
3. Confirm the correct page has loaded by checking the page title and key landmarks.
4. Log the session start with timestamp, target URL, and objective.

### 2. Action Planning

Plan the action sequence before executing:
1. List each required action as a numbered step (e.g., `1. Click "Login" button`, `2. Type username`, `3. Submit form`).
2. Identify potential failure points: CAPTCHAs, rate limiting, authentication gates, dynamic content delays.
3. Define success criteria for each step (e.g., "redirect to /dashboard", "confirmation toast appears").
4. Set retry limits: max 3 retries per action before escalating with an error.

### 3. Execution Loop

For each action in the plan:
1. **Locate** the target element using CSS selector, XPath, or visual coordinates.
2. **Act** — click, type, scroll, hover, or key-press as required.
3. **Wait** — allow page transitions and async content to settle (default 1500ms; increase to 3000ms for heavy SPAs).
4. **Verify** — take a screenshot and confirm the expected state change occurred.
5. **Record** — log the action, selector used, and verification result.

### 4. Data Extraction

When the goal is to extract structured data:
1. Identify the containing element(s) for each data field.
2. Extract text, attributes, or computed styles as needed.
3. Normalize data: trim whitespace, parse dates and numbers, map enums.
4. Output as JSON array with named fields and source selectors.

### 5. Error Handling

| Error Type | Response |
|---|---|
| Element not found | Retry after 2s; try alternate selector; screenshot and log |
| CAPTCHA detected | Pause and surface to user; do not attempt bypass |
| Auth redirect | Check session credentials; re-authenticate if token expired |
| Timeout | Increase wait; check network tab for pending requests |
| Unexpected navigation | Screenshot current state; compare to expected URL; abort if diverged |

### 6. Session Teardown

1. Take a final screenshot documenting the end state.
2. Clear sensitive inputs (passwords, API keys) from memory.
3. Export the session log as structured JSON.
4. Return the collected data and/or confirmation of completed actions to the user.

## Output Format

```json
{
  "session_id": "heady-cu-2026-001",
  "objective": "Extract product listings from example.com",
  "steps_completed": 5,
  "steps_total": 5,
  "status": "success",
  "data": [...],
  "screenshots": ["step_1.png", "step_5.png"],
  "duration_ms": 12400,
  "errors": []
}
```

## Examples

**Input:** "Go to https://shop.headyconnection.org/admin, log in with my stored credentials, and export the pending orders as CSV."

**Plan:**
1. Navigate to login page → screenshot → verify login form present
2. Fill username field → fill password field → click Submit
3. Verify redirect to /admin/dashboard
4. Click Orders → click Filter → select "Pending" → click Export CSV
5. Confirm download initiated → record filename

**Input:** "Screenshot every page of our product catalog at headyconnection.org/products and save them."

**Plan:**
1. Navigate to /products → screenshot page 1
2. Paginate through all pages, screenshot each
3. Return ordered list of screenshot files with page URLs
