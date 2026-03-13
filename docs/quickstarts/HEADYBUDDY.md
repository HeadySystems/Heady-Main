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
<!-- ║  FILE: docs/quickstarts/HEADYBUDDY.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# HeadyBuddy Quickstart

> AI companion that floats above all apps — like Dynamic Island meets Jarvis.

## What is HeadyBuddy?

HeadyBuddy is an always-on AI assistant that:
- **Sees** your screen via vision AI and understands context
- **Listens** for "Hey Heady" voice activation
- **Acts** by executing tasks both visibly (UI clicks, typing) and invisibly (API calls, file ops)
- **Syncs** across desktop and mobile in real-time

## Desktop (Electron)

```bash
cd headybuddy
npm install
npm start
```

HeadyBuddy appears as a floating pill at the bottom-right of your screen. Click to expand into the chat widget, or expand further into the full dashboard with pipeline controls.

### UI States
| State | Description |
|-------|-------------|
| **Pill** | Compact floating bubble showing status |
| **Widget** | Chat interface with suggestion chips |
| **Expanded** | Full dashboard with pipeline, nodes, and cross-device sync |

### Key Components
- `CollapsedPill.jsx` — Compact status indicator with resource health dot
- `MainWidget.jsx` — Chat interface with message history and voice input
- `ExpandedView.jsx` — Full dashboard with pipeline orchestrator view
- `CrossDeviceSync.jsx` — Real-time sync status across devices
- `SacredAvatar.jsx` — Animated avatar reflecting system state

## Mobile (Android)

```bash
cd headybuddy-mobile
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Required Permissions
1. **Display over other apps** — for floating bubble overlay
2. **Notifications** — for task alerts and status updates
3. **Background activity** — for persistent service connection

### Battery Setup
Settings > Battery > Battery Optimization > HeadyBuddy > Don't optimize

## Configuration

HeadyBuddy connects to the HeadyManager backend:

```bash
# Set in .env or environment
VITE_HEADY_API=http://localhost:3301/api
```

The backend provides:
- `/api/buddy/chat` — Send messages to HeadyBuddy AI
- `/api/buddy/orchestrator` — Pipeline state for expanded view
- `/api/buddy/state` — Cross-device state sync
- `/api/headybuddy-config` — Dynamic configuration
- `/api/resources/health` — CPU/RAM monitoring

## Usage Tips

- **Quick Chat**: Click the pill, type your question, press Enter
- **Voice**: Click the microphone icon (Web Speech API)
- **Suggestions**: Click suggestion chips for common actions
- **Pipeline**: Expand to full view to see HCFullPipeline status
- **Escape**: Press Esc to collapse back to pill

## Next Steps

- [HeadyBuddy Guide](../../HEADYBUDDY_GUIDE.md) — Full architecture and implementation details
- [Service Integration](../guides/SERVICE_INTEGRATION.md) — How HeadyBuddy connects to backend services
- [HeadyMCP Quickstart](./HEADYMCP.md) — Set up the backend that HeadyBuddy talks to
