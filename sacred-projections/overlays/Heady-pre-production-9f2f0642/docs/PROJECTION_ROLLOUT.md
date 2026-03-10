# Projection Rollout

## Sequence

1. Validate the foundation runtime first.
2. Create or refresh the target repos for each domain surface.
3. Copy the matching `projections/<repo>/site/` directory into the target repo root.
4. Mount the host shell if you want a single operator entry point.
5. Replace the placeholder runtime panels with live service wiring from the foundation modules.
6. Add deploy automation only after domain shells and runtime service contracts are stable.

## Goal

Use a stable architectural spine and simple domain shells first, then deepen each surface with live data and governed actions.
