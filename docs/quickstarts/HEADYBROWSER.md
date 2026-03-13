<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: docs/quickstarts/HEADYBROWSER.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# HeadyBrowser Quickstart

> A privacy-first browser with built-in HeadyBuddy AI and Sacred Geometry aesthetics.

## What is HeadyBrowser?

HeadyBrowser comes in two forms:

1. **Chrome Extension** — Adds HeadyBuddy to any Chromium browser
2. **Desktop App** — Full Electron-based browser with custom UI

## Chrome Extension

### Install
```bash
cd extensions/chrome
# Load as unpacked extension:
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extensions/chrome directory
```

### Features
- **Popup panel** — Quick access to HeadyBuddy from the toolbar
- **Context menu** — Right-click any text to analyze with HeadyAI
- **Page analysis** — Press `Alt+H` to analyze the current page
- **Content script** — HeadyBuddy overlay on any webpage

### Files
| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration (Manifest V3) |
| `background.js` | Service worker for background processing |
| `content.js` | Injected script for page interaction |
| `popup.html/js` | Toolbar popup UI |
| `content.css` | Styling for injected elements |

## Desktop Browser (Electron)

### Install & Run
```bash
cd headybrowser-desktop
npm install
npm start
```

### Features
- Custom tab bar and address bar with Sacred Geometry design
- Built-in HeadyBuddy floating overlay
- Ad/tracker blocking via electron-ad-blocker
- Custom new tab page with Heady dashboard
- Bookmark sync via Heady API
- Privacy-first: no telemetry, local-first data

## Configuration

Both versions connect to the HeadyManager backend:
```bash
# Set backend URL
HEADY_API_URL=http://localhost:3300
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+H` | Toggle HeadyBuddy overlay |
| `Ctrl+Shift+B` | Open HeadyBuddy sidebar |
| `Right-click` | Context menu with AI actions |

## Next Steps

- [HeadyBuddy Quickstart](./HEADYBUDDY.md) — The AI companion that powers the browser
- [HeadyWeb Fusion Plan](../HeadyWeb-Fusion-Plan.md) — Full browser development roadmap
- [Chrome Extension Source](../../extensions/chrome/) — Extension source code
