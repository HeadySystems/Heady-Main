---
name: heady-trading-intelligence
description: Use when analyzing trading signals, building risk models, designing backtests, constructing portfolios, or running sentiment/options/macro/execution analysis with phi-scaled constants.
---

# Heady™ Trading Intelligence Skill

## Overview

8 phi-scaled trading prompts for signal analysis, risk modeling, backtesting, portfolio construction, sentiment analysis, options strategy, macro analysis, and execution algorithms.

## Prompt Types

| Type | ID | Focus |
|---|---|---|
| signal-analysis | trading-001 | Technical signal analysis with φ-scaled confidence |
| risk-model | trading-002 | φ-tiered risk allocation (conservative/moderate/aggressive) |
| backtest | trading-003 | Fibonacci retracement entry/exit with MC simulation |
| portfolio | trading-004 | φ-weighted allocation (primary PSI, secondary PSI²) |
| sentiment | trading-005 | Fear/greed on phi-scaled continuum (-1 to +1) |
| options | trading-006 | Options strategies with phi-scaled Greeks (Delta = PSI) |
| macro | trading-007 | Fibonacci time-cycle detection (1,2,3,5,8,13,21 months) |
| execution | trading-008 | Fibonacci time-sliced order execution |

## φ Constants

- **PHI** = 1.618 — golden ratio
- **PSI** = 0.618 — strong signal threshold
- **PSI²** = 0.382 — minimum signal threshold

## Usage

```bash
node -e "require('./src/mcp/tools/heady-trading-intelligence-tool').handler({action:'analyze', prompt_type:'signal-analysis', variables:{asset:'BTC', timeframe:'4H'}}).then(console.log)"
```
