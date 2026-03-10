# Monorepo Overlay

These files are designed to drop into the public Heady pre-production monorepo as a clean projection layer.

## Contents

- `configs/projection-manifest.json` — canonical mapping from repos to domains and surface folders
- `apps/headyweb-projection-host/` — shared host shell for domain remotes
- `src/projection/domain-remotes.js` — registry of remotes and their target repos
- `scripts/projection/generate-projection-map.js` — utility to emit a simple projection inventory
- `docs/PROJECTION_ROLLOUT.md` — rollout sequence for applying the surfaces cleanly
