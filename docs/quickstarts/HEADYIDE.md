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
<!-- ║  FILE: docs/quickstarts/HEADYIDE.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# HeadyAI-IDE Quickstart

> A custom IDE built on VSCode/Windsurf with Heady branding and built-in AI.

## What is HeadyAI-IDE?

HeadyAI-IDE is a fully branded development environment that bundles:
- **HeadyBuddy sidebar** — AI assistant right in your editor
- **Heady Dark theme** — Purple (#7B68EE), gold (#FFD700), deep blue (#1a1a2e)
- **AI-first keybindings** — `Ctrl+Shift+H` for command palette
- **Pre-installed extensions** — ESLint, Prettier, GitLens, Docker, Python

## Build Strategy

HeadyAI-IDE uses the **extension + configuration** approach rather than a full VSCode fork:

1. **Product JSON override** — Custom branding (name, icon, colors)
2. **Built-in extension** — HeadyBuddy sidebar panel
3. **Default settings** — Heady Dark theme, AI-first keybindings
4. **Pre-installed extensions** — Curated stack for Heady development

## Quick Start

### Option 1: Extension-Only (Recommended)
```bash
cd extensions/vscode
npm install
npx vsce package
code --install-extension heady-ide-0.1.0.vsix
```

### Option 2: Full Custom Build
```bash
cd HeadyAI-IDE
yarn install
yarn run compile
yarn run gulp vscode-win32-x64-archive   # Windows
yarn run gulp vscode-linux-x64-archive   # Linux
```

## Configuration

Create a `.env` file in your project root:
```ini
HEADY_API_KEY=your_api_key
BACKEND_URL=http://localhost:3300
```

## Key Customizations

| Area | Details |
|------|---------|
| **Name** | `nameShort: "HeadyAI-IDE"`, `applicationName: "headyai-ide"` |
| **Icon** | Sacred Geometry infinity symbol |
| **Theme** | Heady Dark: purple accents, deep blue background |
| **Sidebar** | HeadyBuddy panel for in-editor AI chat |
| **Keybindings** | `Ctrl+Shift+H` opens Heady command palette |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Open Heady command palette |
| `/buddy` | Chat with HeadyBuddy in terminal |
| `/deploy` | Trigger deployment pipeline |
| `/status` | Show system health |

## Directory Structure

```
HeadyAI-IDE/
├── product.json              # Branding overrides
├── resources/                # Icons and assets
├── extensions/
│   └── heady-ide-extension/  # Built-in HeadyBuddy panel
└── src/vs/workbench/         # Theme and UI customizations
```

## Next Steps

- [HeadyAI-IDE Guide](../../HEADYAI_IDE_GUIDE.md) — Full implementation guide
- [HeadyBuddy Quickstart](./HEADYBUDDY.md) — Set up the AI companion
- [IDE Integration Docs](../IDE_INTEGRATION.md) — Deep integration patterns
