<!-- HEADY_BRAND:BEGIN -->
<<<<<<< HEAD
<!-- HEADY SYSTEMS :: SACRED GEOMETRY -->
<!-- FILE: .windsurf/workflows/branding-protocol.md -->
<!-- LAYER: root -->
<!--  -->
<!--         _   _  _____    _    ____   __   __ -->
<!--        | | | || ____|  / \  |  _ \ \ \ / / -->
<!--        | |_| ||  _|   / _ \ | | | | \ V /  -->
<!--        |  _  || |___ / ___ \| |_| |  | |   -->
<!--        |_| |_||_____/_/   \_\____/   |_|   -->
<!--  -->
<!--    Sacred Geometry :: Organic Systems :: Breathing Interfaces -->
<!-- HEADY_BRAND:END -->

---
description: Heady ASCII Branding Protocol (retrofit + enforce)
---

# Heady ASCII Branding Protocol

## Goal
Ensure eligible source files are branded with a consistent, visually exciting ASCII header.

## What gets branded
- JavaScript/TypeScript: `.js`, `.jsx`, `.ts`, `.tsx`, `.cjs`, `.mjs`
- Python: `.py`
- PowerShell: `.ps1`
- Shell: `.sh`
- Markdown: `.md`
- YAML: `.yml`, `.yaml`
- Config (hash-comment style): `Dockerfile`, `.env*`, `.gitignore`, `.gitattributes`, `requirements.txt`, `docker-compose*.yml/.yaml`, `render.yml/.yaml`

## What is skipped
- Files that cannot safely contain comments: `.json`, `.lock`, `.ipynb`
- Generated/minified: `*.min.js`, `*.map`
- Large files (> 1MB)
- Ignored/build/vendor dirs: `.git/`, `node_modules/`, `dist/`, `build/`, `venv/`, `.venv/`, `__pycache__/`, `.pytest_cache/`

## One-time retrofit
1. Run:
   - `npm run brand:fix`

## Enforce going forward
1. Install Git hooks path (local repo setting):
   - `npm run hooks:install`
2. Ensure CI passes (GitHub Action):
   - Workflow: `.github/workflows/brand-headers.yml`

## Developer usage
- Check (no writes): `npm run brand:check`
- Fix in-place: `npm run brand:fix`

## Notes
- Branding is idempotent: existing branded blocks are updated/replaced, not duplicated.
- Python shebang/encoding lines are preserved above the branding block.
=======
<!-- ╔══════════════════════════════════════════════════════════════════╗ -->
<!-- ║  █╗  █╗███████╗ █████╗ ██████╗ █╗   █╗                     ║ -->
<!-- ║  █║  █║█╔════╝█╔══█╗█╔══█╗╚█╗ █╔╝                     ║ -->
<!-- ║  ███████║█████╗  ███████║█║  █║ ╚████╔╝                      ║ -->
<!-- ║  █╔══█║█╔══╝  █╔══█║█║  █║  ╚█╔╝                       ║ -->
<!-- ║  █║  █║███████╗█║  █║██████╔╝   █║                        ║ -->
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║ -->
<!-- ║                                                                  ║ -->
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║ -->
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║ -->
<!-- ║  FILE: .windsurf/workflows/branding-protocol.md                   ║ -->
<!-- ║  LAYER: root                                                      ║ -->
<!-- ╚══════════════════════════════════════════════════════════════════╝ -->
<!-- HEADY_BRAND:END -->

---
description: Heady Sacred Geometry Branding Protocol — enforce colorful, heavily branded file headers across the entire project
---

# Heady Sacred Geometry Branding Protocol

## Goal
Every eligible source file carries a **heavy, colorful, visually striking** branded header using the Sacred Geometry block-letter ASCII art. The branding is enforced at three gates: **CLI**, **Git hook**, and **CI**.

## Banner Style
All branded files receive a box-drawn header with the full HEADY block-letter logo:
```
╔══════════════════════════════════════════════════════════════════╗
║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
║                                                                  ║
║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║  FILE: <relative-path>                                          ║
║  LAYER: <layer>                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```
Wrapped in the appropriate comment syntax per file type (// for JS, # for Python/YAML/PS1, <!-- --> for Markdown).

## What Gets Branded
- **JavaScript/TypeScript:** `.js`, `.jsx`, `.ts`, `.tsx`, `.cjs`, `.mjs`
- **Python:** `.py`
- **PowerShell:** `.ps1`
- **Shell:** `.sh`
- **Markdown:** `.md`
- **YAML:** `.yml`, `.yaml`
- **Config (hash-comment):** `Dockerfile`, `.env*`, `.gitignore`, `.gitattributes`, `requirements.txt`, `docker-compose*.yml/.yaml`, `render.yml/.yaml`

## What Gets Skipped
- Binary/non-commentable: `.json`, `.lock`, `.ipynb`, `.png`, `.jpg`, `.gif`, `.pdf`, `.zip`, `.exe`
- Generated/minified: `*.min.js`, `*.map`
- Large files (> 1MB)
- Vendor/build dirs: `.git/`, `node_modules/`, `dist/`, `build/`, `venv/`, `__pycache__/`, `.pytest_cache/`

## Layer Mapping
Files are auto-tagged with a layer based on path:
- `public/` → `ui/public`
- `frontend/` → `ui/frontend`
- `backend/` → `backend`
- `src/` → `backend/src`
- `tests/` → `tests`
- `docs/` → `docs`
- Everything else → `root`

## Color Scheme (Terminal Output)
- **Cyan** — Box borders, headers, protocol names
- **Magenta** — HEADY block letters, agent counts
- **Green** — Success checkmarks, status dots
- **Yellow** — Warnings, ∞ Sacred Geometry tagline
- **Red** — Failures
- **Dim/Gray** — Skipped items, secondary info

## Steps

### 1. One-Time Retrofit (brand all existing files)
// turbo
```
npm run brand:fix
```

### 2. Check Without Writing
// turbo
```
npm run brand:check
```

### 3. Verbose Check (shows all files including already-branded)
// turbo
```
npm run brand:check -- --verbose
```

### 4. Install Git Pre-Commit Hook (auto-brands staged files)
```
npm run hooks:install
```
The hook runs `node scripts/brand_headers.js --fix --staged` before each commit.

### 5. CI Enforcement (GitHub Action)
Workflow: `.github/workflows/brand-headers.yml`
Runs `npm run brand:check` on every push/PR to `main`.

## Notes
- Branding is **idempotent** — existing blocks are replaced, never duplicated.
- Python shebang/encoding lines are preserved above the brand block.
- The branding script (`scripts/brand_headers.js`) outputs a colorful ANSI report with the HEADY banner.
- The `heady-manager.js` server prints a branded startup banner on boot.
- Standards reference: `.heady/branding.md`
>>>>>>> origin/main
