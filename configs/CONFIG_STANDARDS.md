# Heady™ Configuration Standards

> © 2026 HeadySystems Inc. — φ-compliant configuration architecture

## Format Convention

| Format | Use For | Rationale |
|--------|---------|-----------|
| **YAML** (primary) | Pipeline configs, service configs, deployment, governance, alerting | Human-readable, comment-friendly, better for complex structures |
| **JSON** (mirror) | Pipeline canonical schema, registry, cognitive config, secrets manifests | Machine-parseable, schema-validatable, API-consumable |
| **Both** | `hcfullpipeline.yaml` + `hcfullpipeline.json` | YAML is source of truth, JSON is derived mirror — parity validated by `hcfullpipeline-validator.test.js` |

## Naming Convention

- **kebab-case** for all config filenames: `heady-cognitive-config.json`, `phi-scales.yaml`
- **Prefix** domain-specific configs: `hcfullpipeline-*.yaml`, `heady-buddy.yaml`
- **Suffix** variants: `-sovereign.json`, `-phi.json`, `-canonical.json`

## φ-Compliance Rules

All numeric constants in config files must be derived from:

| Source | Examples | Usage |
|--------|----------|-------|
| **φ^n × 1000** | 1618, 2618, 4236, 6854, 11090, 17944, 29034 | Timeouts, intervals |
| **fib(n)** | 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 987 | Limits, counts, budgets |
| **1/φ ≈ 0.618** | 0.618 | CSL gates, thresholds, pass scores |
| **ψ² ≈ 0.382** | 0.382 | Secondary thresholds, jitter coefficients |

## Config Migration Checklist

When creating a new config file:

1. ✅ Use YAML as primary format
2. ✅ Create JSON mirror if the config is consumed by APIs
3. ✅ Add to `heady-registry.json` components list
4. ✅ Add filename to `configs/source-map.json`
5. ✅ Ensure all numeric constants are φ-derived (comment source)
6. ✅ Add validation to `hcfullpipeline-validator.test.js` if pipeline-related

## Current Config Inventory

- **56 config files** in `/configs`
- **34 subdirectories** for organized config groups
- **YAML:JSON ratio** ≈ 60:40 (target: YAML-first, JSON as mirror)
