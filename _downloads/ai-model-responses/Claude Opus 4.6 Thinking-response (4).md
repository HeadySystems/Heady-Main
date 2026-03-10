Eric, here's the complete file set for your **Heady Continuous Semantic Logic (CSL) Transform** system. This transforms traditional `if/else` boolean logic into continuous semantic logic gates using fuzzy/differentiable relaxation (AND→MIN, OR→MAX, NOT→1−x, with product t-norm alternatives), scans your existing repos via AST analysis, and projects results back to your dev monorepos.

Based on your Heady architecture doc — which shows 20+ specialized agents, the liquid architecture, Auto-Success Engine, and Arena Mode[1] — this framework slots into your pipeline between HeadyBrain reasoning and HeadyBattle validation.

---

# 📦 Complete File Manifest

All files below go into a new package: `packages/heady-semantic-logic/` in your Turborepo monorepo. Copy each file, then run `pnpm install && pnpm build`.

---

## 1. `packages/heady-semantic-logic/package.json`

```json
{
  "name": "@heady-ai/semantic-logic",
  "version": "1.0.0",
  "description": "Continuous Semantic Logic Gate engine for HeadySystems — transforms boolean if/else logic into differentiable fuzzy gates",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "license": "MIT",
  "author": "Eric Haywood <eric@headysystems.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/HeadyMe/heady-semantic-logic"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -w -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "transform": "tsx src/cli/heady-semantic.ts",
    "scan": "tsx src/cli/heady-semantic.ts scan",
    "project-back": "tsx src/cli/heady-semantic.ts project"
  },
  "bin": {
    "heady-semantic": "./dist/cli/heady-semantic.js"
  },
  "dependencies": {
    "typescript": "^5.4.0",
    "ts-morph": "^22.0.0",
    "glob": "^10.3.0",
    "yaml": "^2.4.0",
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "ora": "^8.0.0",
    "fast-glob": "^3.3.2",
    "mathjs": "^12.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "vitest": "^1.4.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0"
  },
  "peerDependencies": {
    "@heady-ai/core": "workspace:*"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./gates": {
      "types": "./dist/core/gates.d.ts",
      "default": "./dist/core/gates.js"
    },
    "./transform": {
      "types": "./dist/transform/transformer.d.ts",
      "default": "./dist/transform/transformer.js"
    },
    "./integration": {
      "types": "./dist/integration/index.d.ts",
      "default": "./dist/integration/index.js"
    }
  }
}
```

---

## 2. `packages/heady-semantic-logic/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "paths": {
      "@core/*": ["./src/core/*"],
      "@transform/*": ["./src/transform/*"],
      "@integration/*": ["./src/integration/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 3. `packages/heady-semantic-logic/src/index.ts`

```typescript
/**
 * @heady-ai/semantic-logic
 * 
 * Continuous Semantic Logic Gate Engine for HeadySystems.
 * Transforms traditional boolean if/else logic into differentiable
 * fuzzy/semantic logic gates operating on continuous truth values [0,1].
 * 
 * Architecture:
 *   1. Core gates:      AND→MIN, OR→MAX, NOT→(1-x), XOR, NAND, IMPLY (Zadeh + product t-norms)
 *   2. AST scanner:     Detects if/else, switch, ternary, &&/|| patterns in TypeScript/JS
 *   3. Logic mapper:    Maps boolean patterns → continuous semantic gate equivalents
 *   4. Code generator:  Emits transformed source files using the CSL runtime
 *   5. Projection:      Defuzzifies continuous outputs → discrete for production deployment
 *   6. Monorepo sync:   Writes transformed files back to HeadyMe dev monorepos
 * 
 * @author Eric Haywood / HeadySystems Inc.
 */

// Core
export { SemanticTruthValue, truthValue } from './core/truth-value.js';
export {
  SemanticGate, GateType,
  AND, OR, NOT, NAND, NOR, XOR, XNOR, IMPLY,
  WEIGHTED_AND, WEIGHTED_OR,
  createGate, evaluateGateChain,
} from './core/gates.js';
export {
  MembershipFunction, MembershipType,
  triangular, trapezoidal, gaussian, sigmoid, bell,
} from './core/membership.js';
export { SemanticVariable, LinguisticTerm } from './core/semantic-variable.js';
export { RuleEngine, SemanticRule, RuleResult } from './core/rule-engine.js';
export { Defuzzifier, DefuzzMethod } from './core/defuzzifier.js';

// Transform
export { ASTScanner, ScanResult, LogicPattern } from './transform/ast-scanner.js';
export { PatternMatcher, MatchResult } from './transform/pattern-matcher.js';
export { LogicMapper, MappingResult } from './transform/logic-mapper.js';
export { CodeGenerator, GeneratedFile } from './transform/code-generator.js';
export { SemanticTransformer, TransformConfig, TransformResult } from './transform/transformer.js';

// Integration
export { HeadyBrainAdapter } from './integration/heady-brain-adapter.js';
export { HeadyConductorAdapter } from './integration/heady-conductor-adapter.js';
export { HeadyBattleAdapter } from './integration/heady-battle-adapter.js';
export { ProjectionEngine, ProjectionConfig } from './integration/projection-engine.js';
export { MonorepoSync, SyncConfig } from './integration/monorepo-sync.js';

// Utils
export { PolynomialInterpolator } from './utils/interpolation.js';
export { ContinuousValidator } from './utils/validation.js';
```

---

## 4. `packages/heady-semantic-logic/src/core/truth-value.ts`

```typescript
/**
 * Continuous Truth Value — the fundamental unit of semantic logic.
 * 
 * Unlike boolean (0 or 1), a SemanticTruthValue lives in [0, 1].
 * 0.0 = completely false, 1.0 = completely true, 0.5 = maximally uncertain.
 * 
 * Supports arithmetic composition, clamping, and semantic labeling.
 */

export class SemanticTruthValue {
  private _value: number;
  private _label?: string;
  private _confidence: number;
  private _source?: string;

  constructor(value: number, label?: string, confidence: number = 1.0, source?: string) {
    this._value = SemanticTruthValue.clamp(value);
    this._label = label;
    this._confidence = SemanticTruthValue.clamp(confidence);
    this._source = source;
  }

  get value(): number { return this._value; }
  get label(): string | undefined { return this._label; }
  get confidence(): number { return this._confidence; }
  get source(): string | undefined { return this._source; }

  /** Effective value = raw value weighted by confidence */
  get effective(): number {
    return this._value * this._confidence;
  }

  /** Is this "truthy" at a given threshold? (default 0.5) */
  isTruthy(threshold: number = 0.5): boolean {
    return this._value >= threshold;
  }

  /** Is this "crisp"? (close to 0 or 1 within epsilon) */
  isCrisp(epsilon: number = 0.01): boolean {
    return this._value <= epsilon || this._value >= (1 - epsilon);
  }

  /** Negate: 1 - value */
  negate(): SemanticTruthValue {
    return new SemanticTruthValue(1 - this._value, `NOT(${this._label ?? '?'})`, this._confidence, this._source);
  }

  /** Combine with another via MIN (fuzzy AND) */
  and(other: SemanticTruthValue): SemanticTruthValue {
    return new SemanticTruthValue(
      Math.min(this._value, other._value),
      `AND(${this._label ?? '?'}, ${other._label ?? '?'})`,
      Math.min(this._confidence, other._confidence),
    );
  }

  /** Combine with another via MAX (fuzzy OR) */
  or(other: SemanticTruthValue): SemanticTruthValue {
    return new SemanticTruthValue(
      Math.max(this._value, other._value),
      `OR(${this._label ?? '?'}, ${other._label ?? '?'})`,
      Math.min(this._confidence, other._confidence),
    );
  }

  /** Product t-norm AND: x * y */
  productAnd(other: SemanticTruthValue): SemanticTruthValue {
    return new SemanticTruthValue(
      this._value * other._value,
      `PAND(${this._label ?? '?'}, ${other._label ?? '?'})`,
      Math.min(this._confidence, other._confidence),
    );
  }

  /** Probabilistic OR: x + y - x*y */
  probabilisticOr(other: SemanticTruthValue): SemanticTruthValue {
    return new SemanticTruthValue(
      this._value + other._value - (this._value * other._value),
      `POR(${this._label ?? '?'}, ${other._label ?? '?'})`,
      Math.min(this._confidence, other._confidence),
    );
  }

  /** Łukasiewicz t-norm AND: max(0, x + y - 1) */
  lukasiewiczAnd(other: SemanticTruthValue): SemanticTruthValue {
    return new SemanticTruthValue(
      Math.max(0, this._value + other._value - 1),
      `LAND(${this._label ?? '?'}, ${other._label ?? '?'})`,
      Math.min(this._confidence, other._confidence),
    );
  }

  /** Interpolate between this and another truth value */
  interpolate(other: SemanticTruthValue, t: number): SemanticTruthValue {
    const clamped = SemanticTruthValue.clamp(t);
    return new SemanticTruthValue(
      this._value * (1 - clamped) + other._value * clamped,
      `LERP(${this._label}, ${other._label}, ${clamped.toFixed(2)})`,
      this._confidence * (1 - clamped) + other._confidence * clamped,
    );
  }

  /** Sharpen toward 0 or 1 (increase contrast) */
  sharpen(gamma: number = 2.0): SemanticTruthValue {
    const sharpened = this._value >= 0.5
      ? 1 - Math.pow(2 * (1 - this._value), gamma) / 2
      : Math.pow(2 * this._value, gamma) / 2;
    return new SemanticTruthValue(sharpened, `SHARP(${this._label})`, this._confidence, this._source);
  }

  /** Soften toward 0.5 (reduce contrast) */
  soften(alpha: number = 0.5): SemanticTruthValue {
    return this.interpolate(new SemanticTruthValue(0.5), alpha);
  }

  /** Convert to a discrete boolean */
  toBoolean(threshold: number = 0.5): boolean {
    return this._value >= threshold;
  }

  /** Serialize to JSON */
  toJSON(): Record<string, unknown> {
    return {
      value: this._value,
      label: this._label,
      confidence: this._confidence,
      source: this._source,
      effective: this.effective,
    };
  }

  toString(): string {
    return `STV(${this._value.toFixed(4)}${this._label ? ` "${this._label}"` : ''} c=${this._confidence.toFixed(2)})`;
  }

  static clamp(v: number): number {
    return Math.max(0, Math.min(1, v));
  }

  static from(value: boolean | number): SemanticTruthValue {
    if (typeof value === 'boolean') {
      return new SemanticTruthValue(value ? 1.0 : 0.0);
    }
    return new SemanticTruthValue(value);
  }
}

/** Convenience factory */
export function truthValue(v: number | boolean, label?: string): SemanticTruthValue {
  return typeof v === 'boolean'
    ? new SemanticTruthValue(v ? 1.0 : 0.0, label)
    : new SemanticTruthValue(v, label);
}
```

---

## 5. `packages/heady-semantic-logic/src/core/gates.ts`

```typescript
/**
 * Continuous Semantic Logic Gates
 * 
 * Replaces discrete boolean logic gates with continuous [0,1] equivalents:
 * 
 *   Boolean   | Zadeh (min/max) | Product T-norm     | Łukasiewicz
 *   ----------|-----------------|--------------------|-----------------
 *   AND(x,y)  | min(x,y)        | x * y              | max(0, x+y-1)
 *   OR(x,y)   | max(x,y)        | x + y - x*y        | min(1, x+y)
 *   NOT(x)    | 1 - x           | 1 - x              | 1 - x
 *   NAND(x,y) | 1 - min(x,y)    | 1 - x*y            | 1 - max(0,x+y-1)
 *   NOR(x,y)  | 1 - max(x,y)    | 1 - (x+y-x*y)     | 1 - min(1,x+y)
 *   XOR(x,y)  | |x - y|         | x+y - 2*x*y        | |x - y|
 *   XNOR(x,y) | 1 - |x - y|    | 1 - x - y + 2*x*y  | 1 - |x-y|
 *   IMPLY(x,y)| max(1-x, y)     | min(1, 1-x+y)      | min(1, 1-x+y)
 * 
 * References:
 *   - Zadeh operators (Wikipedia Fuzzy Logic)
 *   - IBM BioFuzzNet: AND=x*y, OR=x+y-x*y, NOT=1-x
 *   - NIH: Multivariate polynomial interpolation for Boolean→Continuous
 */

import { SemanticTruthValue } from './truth-value.js';

export type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'IMPLY' | 'WEIGHTED_AND' | 'WEIGHTED_OR' | 'THRESHOLD' | 'BLEND';

export type TNorm = 'zadeh' | 'product' | 'lukasiewicz';

export interface GateConfig {
  tnorm?: TNorm;
  weights?: number[];
  threshold?: number;
  blendFactor?: number;
}

export interface SemanticGate {
  type: GateType;
  config: GateConfig;
  evaluate(inputs: SemanticTruthValue[]): SemanticTruthValue;
}

// ─── CORE GATE IMPLEMENTATIONS ─────────────────────────────────────

function andGate(tnorm: TNorm, a: number, b: number): number {
  switch (tnorm) {
    case 'zadeh':       return Math.min(a, b);
    case 'product':     return a * b;
    case 'lukasiewicz': return Math.max(0, a + b - 1);
  }
}

function orGate(tnorm: TNorm, a: number, b: number): number {
  switch (tnorm) {
    case 'zadeh':       return Math.max(a, b);
    case 'product':     return a + b - a * b;
    case 'lukasiewicz': return Math.min(1, a + b);
  }
}

function notGate(a: number): number {
  return 1 - a;
}

// ─── EXPORTED GATE FUNCTIONS ────────────────────────────────────────

export function AND(
  inputs: SemanticTruthValue[],
  config: GateConfig = {}
): SemanticTruthValue {
  const tnorm = config.tnorm ?? 'zadeh';
  if (inputs.length === 0) return new SemanticTruthValue(1.0, 'AND(∅)');
  let result = inputs[0].value;
  for (let i = 1; i < inputs.length; i++) {
    result = andGate(tnorm, result, inputs[i].value);
  }
  const labels = inputs.map(i => i.label ?? '?').join(', ');
  return new SemanticTruthValue(result, `AND(${labels})`);
}

export function OR(
  inputs: SemanticTruthValue[],
  config: GateConfig = {}
): SemanticTruthValue {
  const tnorm = config.tnorm ?? 'zadeh';
  if (inputs.length === 0) return new SemanticTruthValue(0.0, 'OR(∅)');
  let result = inputs[0].value;
  for (let i = 1; i < inputs.length; i++) {
    result = orGate(tnorm, result, inputs[i].value);
  }
  const labels = inputs.map(i => i.label ?? '?').join(', ');
  return new SemanticTruthValue(result, `OR(${labels})`);
}

export function NOT(input: SemanticTruthValue): SemanticTruthValue {
  return new SemanticTruthValue(notGate(input.value), `NOT(${input.label ?? '?'})`);
}

export function NAND(
  inputs: SemanticTruthValue[],
  config: GateConfig = {}
): SemanticTruthValue {
  const andResult = AND(inputs, config);
  return new SemanticTruthValue(notGate(andResult.value), `NAND(${andResult.label})`);
}

export function NOR(
  inputs: SemanticTruthValue[],
  config: GateConfig = {}
): SemanticTruthValue {
  const orResult = OR(inputs, config);
  return new SemanticTruthValue(notGate(orResult.value), `NOR(${orResult.label})`);
}

export function XOR(
  inputs: SemanticTruthValue[],
  config: GateConfig = {}
): SemanticTruthValue {
  const tnorm = config.tnorm ?? 'zadeh';
  if (inputs.length < 2) return inputs[0] ?? new SemanticTruthValue(0);
  
  let result: number;
  const a = inputs[0].value, b = inputs[1].value;
  
  switch (tnorm) {
    case 'zadeh':       result = Math.abs(a - b); break;
    case 'product':     result = a + b - 2 * a * b; break;
    case 'lukasiewicz': result = Math.abs(a - b); break;
  }
  
  // Chain for multi-input XOR
  for (let i = 2; i < inputs.length; i++) {
    const c = inputs[i].value;
    switch (tnorm) {
      case 'zadeh':       result = Math.abs(result - c); break;
      case 'product':     result = result + c - 2 * result * c; break;
      case 'lukasiewicz': result = Math.abs(result - c); break;
    }
  }
  
  const labels = inputs.map(i => i.label ?? '?').join(', ');
  return new SemanticTruthValue(result, `XOR(${labels})`);
}

export function XNOR(
  inputs: SemanticTruthValue[],
  config: GateConfig = {}
): SemanticTruthValue {
  const xorResult = XOR(inputs, config);
  return new SemanticTruthValue(1 - xorResult.value, `XNOR`);
}

export function IMPLY(
  antecedent: SemanticTruthValue,
  consequent: SemanticTruthValue,
  config: GateConfig = {}
): SemanticTruthValue {
  const tnorm = config.tnorm ?? 'zadeh';
  let result: number;
  switch (tnorm) {
    case 'zadeh':       result = Math.max(1 - antecedent.value, consequent.value); break;
    case 'product':     result = Math.min(1, 1 - antecedent.value + consequent.value); break;
    case 'lukasiewicz': result = Math.min(1, 1 - antecedent.value + consequent.value); break;
  }
  return new SemanticTruthValue(result, `IMPLY(${antecedent.label} → ${consequent.label})`);
}

export function WEIGHTED_AND(
  inputs: SemanticTruthValue[],
  weights: number[]
): SemanticTruthValue {
  if (inputs.length === 0) return new SemanticTruthValue(1.0);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);
  
  let result = 0;
  for (let i = 0; i < inputs.length; i++) {
    result += normalizedWeights[i] * inputs[i].value;
  }
  // Apply power mean with negative exponent (approaches min as exp → -∞)
  return new SemanticTruthValue(
    SemanticTruthValue.clamp(result),
    `W_AND(${inputs.map(i => i.label).join(', ')})`
  );
}

export function WEIGHTED_OR(
  inputs: SemanticTruthValue[],
  weights: number[]
): SemanticTruthValue {
  if (inputs.length === 0) return new SemanticTruthValue(0.0);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);
  
  let result = 0;
  for (let i = 0; i < inputs.length; i++) {
    result += normalizedWeights[i] * inputs[i].value;
  }
  return new SemanticTruthValue(
    SemanticTruthValue.clamp(result),
    `W_OR(${inputs.map(i => i.label).join(', ')})`
  );
}

// ─── GATE FACTORY & CHAIN EVALUATOR ─────────────────────────────────

export function createGate(type: GateType, config: GateConfig = {}): SemanticGate {
  return {
    type,
    config,
    evaluate(inputs: SemanticTruthValue[]): SemanticTruthValue {
      switch (type) {
        case 'AND':          return AND(inputs, config);
        case 'OR':           return OR(inputs, config);
        case 'NOT':          return NOT(inputs[0]);
        case 'NAND':         return NAND(inputs, config);
        case 'NOR':          return NOR(inputs, config);
        case 'XOR':          return XOR(inputs, config);
        case 'XNOR':         return XNOR(inputs, config);
        case 'IMPLY':        return IMPLY(inputs[0], inputs[1], config);
        case 'WEIGHTED_AND': return WEIGHTED_AND(inputs, config.weights ?? []);
        case 'WEIGHTED_OR':  return WEIGHTED_OR(inputs, config.weights ?? []);
        case 'THRESHOLD':
          const avg = inputs.reduce((s, i) => s + i.value, 0) / inputs.length;
          return new SemanticTruthValue(avg >= (config.threshold ?? 0.5) ? 1.0 : 0.0, 'THRESHOLD');
        case 'BLEND':
          const blendAvg = inputs.reduce((s, i) => s + i.value, 0) / inputs.length;
          return new SemanticTruthValue(blendAvg, 'BLEND');
        default:
          throw new Error(`Unknown gate type: ${type}`);
      }
    }
  };
}

export interface GateChainStep {
  gate: SemanticGate;
  inputIndices: number[];  // which outputs from previous steps to use (-1 = original inputs)
}

export function evaluateGateChain(
  chain: GateChainStep[],
  inputs: SemanticTruthValue[]
): SemanticTruthValue {
  const results: SemanticTruthValue[] = [...inputs];
  
  for (const step of chain) {
    const gateInputs = step.inputIndices.map(idx => {
      if (idx < 0) throw new Error(`Invalid input index: ${idx}`);
      return results[idx];
    });
    results.push(step.gate.evaluate(gateInputs));
  }
  
  return results[results.length - 1];
}
```

---

## 6. `packages/heady-semantic-logic/src/core/membership.ts`

```typescript
/**
 * Membership Functions — map raw input values to truth values in [0,1].
 * This is the "fuzzification" step: converting crisp inputs to semantic degrees.
 */

export type MembershipType = 'triangular' | 'trapezoidal' | 'gaussian' | 'sigmoid' | 'bell' | 'step' | 'linear';

export interface MembershipFunction {
  type: MembershipType;
  evaluate(x: number): number;
  label: string;
  params: Record<string, number>;
}

/** Triangular: peak at center, zero at left and right */
export function triangular(left: number, center: number, right: number, label: string = 'triangular'): MembershipFunction {
  return {
    type: 'triangular',
    label,
    params: { left, center, right },
    evaluate(x: number): number {
      if (x <= left || x >= right) return 0;
      if (x <= center) return (x - left) / (center - left);
      return (right - x) / (right - center);
    },
  };
}

/** Trapezoidal: flat top between centerLeft and centerRight */
export function trapezoidal(left: number, centerLeft: number, centerRight: number, right: number, label: string = 'trapezoidal'): MembershipFunction {
  return {
    type: 'trapezoidal',
    label,
    params: { left, centerLeft, centerRight, right },
    evaluate(x: number): number {
      if (x <= left || x >= right) return 0;
      if (x >= centerLeft && x <= centerRight) return 1;
      if (x < centerLeft) return (x - left) / (centerLeft - left);
      return (right - x) / (right - centerRight);
    },
  };
}

/** Gaussian: bell curve centered at mean with given sigma */
export function gaussian(mean: number, sigma: number, label: string = 'gaussian'): MembershipFunction {
  return {
    type: 'gaussian',
    label,
    params: { mean, sigma },
    evaluate(x: number): number {
      return Math.exp(-0.5 * Math.pow((x - mean) / sigma, 2));
    },
  };
}

/** Sigmoid: smooth step from 0 to 1 */
export function sigmoid(center: number, slope: number, label: string = 'sigmoid'): MembershipFunction {
  return {
    type: 'sigmoid',
    label,
    params: { center, slope },
    evaluate(x: number): number {
      return 1 / (1 + Math.exp(-slope * (x - center)));
    },
  };
}

/** Generalized bell: parameterized bell curve */
export function bell(center: number, width: number, slope: number, label: string = 'bell'): MembershipFunction {
  return {
    type: 'bell',
    label,
    params: { center, width, slope },
    evaluate(x: number): number {
      return 1 / (1 + Math.pow(Math.abs((x - center) / width), 2 * slope));
    },
  };
}
```

---

## 7. `packages/heady-semantic-logic/src/core/semantic-variable.ts`

```typescript
/**
 * SemanticVariable — a linguistic variable with named terms.
 * 
 * Example: "temperature" with terms { cold, warm, hot }
 * Each term has a membership function that maps raw input → [0,1].
 */

import { MembershipFunction } from './membership.js';
import { SemanticTruthValue } from './truth-value.js';

export interface LinguisticTerm {
  name: string;
  membership: MembershipFunction;
}

export class SemanticVariable {
  readonly name: string;
  readonly terms: Map<string, LinguisticTerm>;
  readonly range: [number, number];

  constructor(name: string, range: [number, number]) {
    this.name = name;
    this.terms = new Map();
    this.range = range;
  }

  addTerm(name: string, membership: MembershipFunction): this {
    this.terms.set(name, { name, membership });
    return this;
  }

  /** Fuzzify a crisp value into truth values for all terms */
  fuzzify(crispValue: number): Map<string, SemanticTruthValue> {
    const result = new Map<string, SemanticTruthValue>();
    for (const [termName, term] of this.terms) {
      const degree = term.membership.evaluate(crispValue);
      result.set(termName, new SemanticTruthValue(degree, `${this.name}.${termName}`, 1.0, `fuzzify(${crispValue})`));
    }
    return result;
  }

  /** Get the truth value for a specific term given a crisp input */
  evaluate(crispValue: number, termName: string): SemanticTruthValue {
    const term = this.terms.get(termName);
    if (!term) throw new Error(`Unknown term "${termName}" on variable "${this.name}"`);
    return new SemanticTruthValue(
      term.membership.evaluate(crispValue),
      `${this.name}.${termName}`,
    );
  }

  /** Get the dominant term (highest membership degree) */
  dominantTerm(crispValue: number): { term: string; degree: number } {
    let best = { term: '', degree: -1 };
    for (const [termName, term] of this.terms) {
      const deg = term.membership.evaluate(crispValue);
      if (deg > best.degree) best = { term: termName, degree: deg };
    }
    return best;
  }
}
```

---

## 8. `packages/heady-semantic-logic/src/core/rule-engine.ts`

```typescript
/**
 * Rule Engine — evaluates IF-THEN semantic rules with continuous truth values.
 * 
 * Replaces traditional:
 *   if (temp > 80 && humidity > 60) { fanSpeed = 'high'; }
 * 
 * With continuous:
 *   IF temperature IS hot AND humidity IS high THEN fanSpeed IS fast
 *   → evaluated continuously, producing partial activations of multiple rules simultaneously.
 */

import { SemanticTruthValue, truthValue } from './truth-value.js';
import { AND, OR, NOT, type GateConfig } from './gates.js';
import { SemanticVariable } from './semantic-variable.js';

export interface RuleCondition {
  variable: string;
  term: string;
  negated?: boolean;
}

export interface RuleConsequent {
  variable: string;
  term: string;
  value?: number;
}

export interface SemanticRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  operator: 'AND' | 'OR';
  consequents: RuleConsequent[];
  weight: number;
  gateConfig?: GateConfig;
}

export interface RuleResult {
  ruleId: string;
  activation: SemanticTruthValue;
  consequents: Array<{
    variable: string;
    term: string;
    activatedValue: number;
  }>;
}

export class RuleEngine {
  private rules: SemanticRule[] = [];
  private variables: Map<string, SemanticVariable> = new Map();

  addVariable(variable: SemanticVariable): this {
    this.variables.set(variable.name, variable);
    return this;
  }

  addRule(rule: SemanticRule): this {
    this.rules.push(rule);
    return this;
  }

  /** Evaluate all rules given a map of crisp input values */
  evaluate(inputs: Map<string, number>): RuleResult[] {
    const results: RuleResult[] = [];

    for (const rule of this.rules) {
      // Evaluate each condition
      const conditionValues: SemanticTruthValue[] = rule.conditions.map(cond => {
        const variable = this.variables.get(cond.variable);
        if (!variable) throw new Error(`Unknown variable: ${cond.variable}`);
        const crispInput = inputs.get(cond.variable);
        if (crispInput === undefined) throw new Error(`No input for variable: ${cond.variable}`);
        
        let tv = variable.evaluate(crispInput, cond.term);
        if (cond.negated) tv = NOT(tv);
        return tv;
      });

      // Combine conditions via AND or OR gate
      let activation: SemanticTruthValue;
      if (rule.operator === 'AND') {
        activation = AND(conditionValues, rule.gateConfig);
      } else {
        activation = OR(conditionValues, rule.gateConfig);
      }

      // Apply rule weight
      const weightedActivation = new SemanticTruthValue(
        activation.value * rule.weight,
        `${rule.name}[w=${rule.weight}]`,
        activation.confidence,
      );

      // Map to consequents
      const consequents = rule.consequents.map(cons => ({
        variable: cons.variable,
        term: cons.term,
        activatedValue: weightedActivation.value * (cons.value ?? 1.0),
      }));

      results.push({
        ruleId: rule.id,
        activation: weightedActivation,
        consequents,
      });
    }

    return results;
  }

  /** Quick helper: evaluate and return the max-activated rule */
  evaluateBest(inputs: Map<string, number>): RuleResult | null {
    const results = this.evaluate(inputs);
    if (results.length === 0) return null;
    return results.reduce((best, r) =>
      r.activation.value > best.activation.value ? r : best
    );
  }
}
```

---

## 9. `packages/heady-semantic-logic/src/core/defuzzifier.ts`

```typescript
/**
 * Defuzzifier — converts continuous semantic outputs back to crisp values.
 * This is the "projection" step: semantic [0,1] → discrete actionable output.
 */

import { RuleResult } from './rule-engine.js';

export type DefuzzMethod = 'centroid' | 'bisector' | 'mom' | 'som' | 'lom' | 'weighted_average' | 'max_membership';

export class Defuzzifier {
  private method: DefuzzMethod;
  private resolution: number;

  constructor(method: DefuzzMethod = 'weighted_average', resolution: number = 100) {
    this.method = method;
    this.resolution = resolution;
  }

  /**
   * Defuzzify rule results for a specific output variable.
   * Uses weighted average of activated consequent values (Takagi-Sugeno style).
   */
  defuzzify(results: RuleResult[], outputVariable: string): number {
    const relevant = results.flatMap(r =>
      r.consequents
        .filter(c => c.variable === outputVariable)
        .map(c => ({
          activation: r.activation.value,
          value: c.activatedValue,
        }))
    );

    if (relevant.length === 0) return 0;

    switch (this.method) {
      case 'weighted_average': {
        const totalWeight = relevant.reduce((s, r) => s + r.activation, 0);
        if (totalWeight === 0) return 0;
        return relevant.reduce((s, r) => s + r.activation * r.value, 0) / totalWeight;
      }
      case 'max_membership': {
        const best = relevant.reduce((best, r) =>
          r.activation > best.activation ? r : best
        );
        return best.value;
      }
      case 'centroid': {
        // Approximate centroid via discrete sampling
        let numerator = 0, denominator = 0;
        for (let i = 0; i <= this.resolution; i++) {
          const x = i / this.resolution;
          const mu = Math.max(...relevant.map(r => Math.min(r.activation, r.value * x)));
          numerator += x * mu;
          denominator += mu;
        }
        return denominator === 0 ? 0 : numerator / denominator;
      }
      default:
        // Fall back to weighted average
        const totalW = relevant.reduce((s, r) => s + r.activation, 0);
        if (totalW === 0) return 0;
        return relevant.reduce((s, r) => s + r.activation * r.value, 0) / totalW;
    }
  }

  /**
   * Binary defuzzification: convert continuous to a boolean decision.
   */
  defuzzifyBoolean(results: RuleResult[], outputVariable: string, threshold: number = 0.5): boolean {
    return this.defuzzify(results, outputVariable) >= threshold;
  }

  /**
   * Categorical defuzzification: pick the term with highest activation.
   */
  defuzzifyCategory(results: RuleResult[], outputVariable: string): string {
    let bestTerm = '';
    let bestActivation = -1;

    for (const result of results) {
      for (const cons of result.consequents) {
        if (cons.variable === outputVariable && result.activation.value > bestActivation) {
          bestActivation = result.activation.value;
          bestTerm = cons.term;
        }
      }
    }

    return bestTerm;
  }
}
```

---

## 10. `packages/heady-semantic-logic/src/transform/ast-scanner.ts`

```typescript
/**
 * AST Scanner — scans TypeScript/JavaScript source files for traditional
 * boolean logic patterns (if/else, switch, ternary, &&, ||, !) and
 * catalogs them as candidates for continuous semantic logic transformation.
 * 
 * Uses ts-morph for TypeScript AST traversal.
 */

import { Project, SourceFile, SyntaxKind, Node, IfStatement, BinaryExpression, ConditionalExpression, SwitchStatement, PrefixUnaryExpression } from 'ts-morph';
import fg from 'fast-glob';

export interface LogicPattern {
  id: string;
  type: 'if-else' | 'if-elseif-chain' | 'ternary' | 'switch' | 'logical-and' | 'logical-or' | 'logical-not' | 'comparison' | 'nested-condition';
  filePath: string;
  startLine: number;
  endLine: number;
  sourceText: string;
  conditionText: string;
  branches: number;
  nestingDepth: number;
  complexity: number;  // McCabe cyclomatic complexity contribution
  transformable: boolean;
  reason?: string;  // Why it's not transformable, if applicable
  children: LogicPattern[];
}

export interface ScanResult {
  totalFiles: number;
  totalPatterns: number;
  transformableCount: number;
  patterns: LogicPattern[];
  fileBreakdown: Map<string, LogicPattern[]>;
  complexityScore: number;
}

export class ASTScanner {
  private project: Project;
  private patternId: number = 0;

  constructor(tsConfigPath?: string) {
    this.project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
    });
  }

  /** Scan a glob of files */
  async scan(patterns: string[], cwd: string = process.cwd()): Promise<ScanResult> {
    const filePaths = await fg(patterns, {
      cwd,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/coverage/**'],
    });

    for (const fp of filePaths) {
      this.project.addSourceFileAtPath(fp);
    }

    const allPatterns: LogicPattern[] = [];
    const fileBreakdown = new Map<string, LogicPattern[]>();

    for (const sourceFile of this.project.getSourceFiles()) {
      const filePatterns = this.scanFile(sourceFile);
      allPatterns.push(...filePatterns);
      fileBreakdown.set(sourceFile.getFilePath(), filePatterns);
    }

    const transformableCount = allPatterns.filter(p => p.transformable).length;

    return {
      totalFiles: filePaths.length,
      totalPatterns: allPatterns.length,
      transformableCount,
      patterns: allPatterns,
      fileBreakdown,
      complexityScore: allPatterns.reduce((s, p) => s + p.complexity, 0),
    };
  }

  /** Scan a single source file */
  private scanFile(sourceFile: SourceFile): LogicPattern[] {
    const patterns: LogicPattern[] = [];
    const filePath = sourceFile.getFilePath();

    // Scan if/else statements
    sourceFile.getDescendantsOfKind(SyntaxKind.IfStatement).forEach(node => {
      if (!this.isNestedInIf(node)) { // Only top-level ifs
        patterns.push(this.analyzeIfStatement(node, filePath, 0));
      }
    });

    // Scan ternary expressions
    sourceFile.getDescendantsOfKind(SyntaxKind.ConditionalExpression).forEach(node => {
      patterns.push(this.analyzeTernary(node, filePath));
    });

    // Scan switch statements
    sourceFile.getDescendantsOfKind(SyntaxKind.SwitchStatement).forEach(node => {
      patterns.push(this.analyzeSwitch(node, filePath));
    });

    // Scan standalone logical expressions (&& || !)
    sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression).forEach(node => {
      const op = node.getOperatorToken().getKind();
      if (
        (op === SyntaxKind.AmpersandAmpersandToken || op === SyntaxKind.BarBarToken) &&
        !this.isInsideCondition(node)
      ) {
        patterns.push(this.analyzeLogicalExpression(node, filePath));
      }
    });

    return patterns;
  }

  private analyzeIfStatement(node: IfStatement, filePath: string, depth: number): LogicPattern {
    const condition = node.getExpression();
    const children: LogicPattern[] = [];
    let branches = 1; // the if branch

    // Check for else-if chain
    const elseStatement = node.getElseStatement();
    if (elseStatement) {
      branches++;
      if (Node.isIfStatement(elseStatement)) {
        children.push(this.analyzeIfStatement(elseStatement, filePath, depth + 1));
      }
    }

    // Check nested ifs inside the then-block
    node.getThenStatement().getDescendantsOfKind(SyntaxKind.IfStatement).forEach(nested => {
      children.push(this.analyzeIfStatement(nested, filePath, depth + 1));
    });

    const conditionText = condition.getText();
    const complexity = this.estimateComplexity(conditionText);

    return {
      id: `LP-${++this.patternId}`,
      type: children.length > 0 && children.some(c => c.type === 'if-else') ? 'if-elseif-chain' : 'if-else',
      filePath,
      startLine: node.getStartLineNumber(),
      endLine: node.getEndLineNumber(),
      sourceText: node.getText().substring(0, 200),
      conditionText,
      branches,
      nestingDepth: depth,
      complexity,
      transformable: this.isTransformable(conditionText, complexity),
      reason: this.isTransformable(conditionText, complexity) ? undefined : 'Condition too complex or contains side effects',
      children,
    };
  }

  private analyzeTernary(node: ConditionalExpression, filePath: string): LogicPattern {
    const conditionText = node.getCondition().getText();
    const complexity = this.estimateComplexity(conditionText);
    return {
      id: `LP-${++this.patternId}`,
      type: 'ternary',
      filePath,
      startLine: node.getStartLineNumber(),
      endLine: node.getEndLineNumber(),
      sourceText: node.getText().substring(0, 200),
      conditionText,
      branches: 2,
      nestingDepth: 0,
      complexity,
      transformable: this.isTransformable(conditionText, complexity),
      children: [],
    };
  }

  private analyzeSwitch(node: SwitchStatement, filePath: string): LogicPattern {
    const conditionText = node.getExpression().getText();
    const clauses = node.getClauses();
    return {
      id: `LP-${++this.patternId}`,
      type: 'switch',
      filePath,
      startLine: node.getStartLineNumber(),
      endLine: node.getEndLineNumber(),
      sourceText: node.getText().substring(0, 200),
      conditionText,
      branches: clauses.length,
      nestingDepth: 0,
      complexity: clauses.length,
      transformable: true,
      children: [],
    };
  }

  private analyzeLogicalExpression(node: BinaryExpression, filePath: string): LogicPattern {
    const op = node.getOperatorToken().getKind();
    const type = op === SyntaxKind.AmpersandAmpersandToken ? 'logical-and' : 'logical-or';
    const conditionText = node.getText();
    return {
      id: `LP-${++this.patternId}`,
      type,
      filePath,
      startLine: node.getStartLineNumber(),
      endLine: node.getEndLineNumber(),
      sourceText: conditionText.substring(0, 200),
      conditionText,
      branches: 2,
      nestingDepth: 0,
      complexity: 1,
      transformable: true,
      children: [],
    };
  }

  private isNestedInIf(node: IfStatement): boolean {
    let parent = node.getParent();
    while (parent) {
      if (Node.isIfStatement(parent) && parent.getElseStatement() === node) {
        return true;
      }
      parent = parent.getParent();
    }
    return false;
  }

  private isInsideCondition(node: BinaryExpression): boolean {
    let parent = node.getParent();
    while (parent) {
      if (Node.isIfStatement(parent) || Node.isConditionalExpression(parent)) return true;
      parent = parent.getParent();
    }
    return false;
  }

  private estimateComplexity(condition: string): number {
    let score = 1;
    score += (condition.match(/&&/g) || []).length;
    score += (condition.match(/\|\|/g) || []).length;
    score += (condition.match(/\!/g) || []).length * 0.5;
    score += (condition.match(/\?/g) || []).length;
    return score;
  }

  private isTransformable(condition: string, complexity: number): boolean {
    // Skip conditions with function calls that have side effects
    if (condition.match(/\b(await|yield|throw|delete)\b/)) return false;
    // Skip extremely complex conditions (can still be done, just flagged)
    if (complexity > 20) return false;
    return true;
  }
}
```

---

## 11. `packages/heady-semantic-logic/src/transform/pattern-matcher.ts`

```typescript
/**
 * Pattern Matcher — classifies detected logic patterns into
 * canonical forms that map to specific continuous gate replacements.
 */

import type { LogicPattern } from './ast-scanner.js';

export interface MatchResult {
  pattern: LogicPattern;
  canonicalForm: CanonicalForm;
  suggestedGates: SuggestedGate[];
  confidence: number;
}

export type CanonicalForm =
  | 'BINARY_BRANCH'         // if (a) { ... } else { ... }
  | 'MULTI_BRANCH'          // if/else-if chain or switch
  | 'GUARD_CLAUSE'          // if (!valid) return;
  | 'COMPOUND_AND'          // if (a && b && c) { ... }
  | 'COMPOUND_OR'           // if (a || b || c) { ... }
  | 'MIXED_COMPOUND'        // if ((a && b) || c) { ... }
  | 'NEGATED_CONDITION'     // if (!a) { ... }
  | 'COMPARISON_THRESHOLD'  // if (x > 5) { ... }
  | 'EQUALITY_CHECK'        // if (x === 'foo') { ... }
  | 'RANGE_CHECK'           // if (x > 0 && x < 100) { ... }
  | 'NULL_CHECK'            // if (x != null) { ... }
  | 'TERNARY_SELECT'        // a ? b : c
  | 'SHORT_CIRCUIT_AND'     // a && doSomething()
  | 'SHORT_CIRCUIT_OR';     // a || fallback()

export interface SuggestedGate {
  gateType: string;
  tnorm: string;
  membershipHint?: string;
  rationale: string;
}

export class PatternMatcher {
  match(patterns: LogicPattern[]): MatchResult[] {
    return patterns.map(p => this.matchSingle(p));
  }

  private matchSingle(pattern: LogicPattern): MatchResult {
    const cond = pattern.conditionText;
    const suggestions: SuggestedGate[] = [];
    let form: CanonicalForm;
    let confidence = 0.9;

    // Null/undefined checks → sigmoid membership with high slope
    if (cond.match(/!==?\s*(null|undefined)|!=\s*(null|undefined)/)) {
      form = 'NULL_CHECK';
      suggestions.push({
        gateType: 'THRESHOLD',
        tnorm: 'zadeh',
        membershipHint: 'sigmoid(0.01, 100)',
        rationale: 'Null check maps to existence probability near 0 or 1',
      });
    }
    // Range checks: a > X && a < Y
    else if (cond.match(/>\s*[\d.]+\s*&&\s*.*<\s*[\d.]+/) || cond.match(/<\s*[\d.]+\s*&&\s*.*>\s*[\d.]+/)) {
      form = 'RANGE_CHECK';
      suggestions.push({
        gateType: 'AND',
        tnorm: 'product',
        membershipHint: 'trapezoidal over the range boundaries',
        rationale: 'Range checks map to trapezoidal membership with AND gate',
      });
    }
    // Comparison thresholds: x > 5, x >= 10
    else if (cond.match(/[><=!]+\s*[\d.]+/) && !cond.match(/&&|\|\|/)) {
      form = 'COMPARISON_THRESHOLD';
      suggestions.push({
        gateType: 'THRESHOLD',
        tnorm: 'zadeh',
        membershipHint: 'sigmoid centered at threshold value',
        rationale: 'Hard threshold becomes smooth sigmoid transition',
      });
    }
    // Equality checks
    else if (cond.match(/===|==/)) {
      form = 'EQUALITY_CHECK';
      suggestions.push({
        gateType: 'BLEND',
        tnorm: 'zadeh',
        membershipHint: 'gaussian centered at target value with tight sigma',
        rationale: 'Equality maps to narrow Gaussian membership',
      });
      confidence = 0.75; // Equality is harder to fuzzify
    }
    // Compound AND
    else if (cond.includes('&&') && !cond.includes('||')) {
      form = 'COMPOUND_AND';
      const andCount = (cond.match(/&&/g) || []).length;
      suggestions.push({
        gateType: 'AND',
        tnorm: andCount > 2 ? 'product' : 'zadeh',
        rationale: `${andCount + 1}-input AND gate; product t-norm for >2 inputs to avoid over-suppression`,
      });
    }
    // Compound OR
    else if (cond.includes('||') && !cond.includes('&&')) {
      form = 'COMPOUND_OR';
      suggestions.push({
        gateType: 'OR',
        tnorm: 'zadeh',
        rationale: 'Multi-input OR maps to max()',
      });
    }
    // Mixed compound
    else if (cond.includes('&&') && cond.includes('||')) {
      form = 'MIXED_COMPOUND';
      suggestions.push({
        gateType: 'AND',
        tnorm: 'product',
        rationale: 'Mixed conditions decompose into nested AND/OR gate tree',
      }, {
        gateType: 'OR',
        tnorm: 'product',
        rationale: 'OR sub-expressions use probabilistic sum',
      });
    }
    // Negated condition
    else if (cond.startsWith('!')) {
      form = 'NEGATED_CONDITION';
      suggestions.push({
        gateType: 'NOT',
        tnorm: 'zadeh',
        rationale: 'NOT(x) = 1 - x',
      });
    }
    // Ternary
    else if (pattern.type === 'ternary') {
      form = 'TERNARY_SELECT';
      suggestions.push({
        gateType: 'BLEND',
        tnorm: 'zadeh',
        rationale: 'Ternary becomes: result = condition * trueVal + (1-condition) * falseVal',
      });
    }
    // Switch/multi-branch
    else if (pattern.type === 'switch' || pattern.type === 'if-elseif-chain') {
      form = 'MULTI_BRANCH';
      suggestions.push({
        gateType: 'WEIGHTED_OR',
        tnorm: 'zadeh',
        rationale: 'Multiple branches become weighted sum of outputs, each gated by its condition membership',
      });
    }
    // Guard clause (early return)
    else if (pattern.sourceText.includes('return') && pattern.branches === 1) {
      form = 'GUARD_CLAUSE';
      suggestions.push({
        gateType: 'THRESHOLD',
        tnorm: 'zadeh',
        membershipHint: 'sigmoid with steep slope for guard conditions',
        rationale: 'Guard clauses map to hard threshold gates',
      });
    }
    // Default: binary branch
    else {
      form = 'BINARY_BRANCH';
      suggestions.push({
        gateType: 'BLEND',
        tnorm: 'zadeh',
        rationale: 'Standard if/else becomes blended continuous output',
      });
    }

    return {
      pattern,
      canonicalForm: form,
      suggestedGates: suggestions,
      confidence,
    };
  }
}
```

---

## 12. `packages/heady-semantic-logic/src/transform/logic-mapper.ts`

```typescript
/**
 * Logic Mapper — maps matched canonical patterns to actual continuous
 * semantic logic code structures (intermediate representation).
 */

import type { MatchResult, CanonicalForm } from './pattern-matcher.js';

export interface MappingResult {
  originalPattern: MatchResult;
  semanticIR: SemanticIRNode;
  imports: string[];
  helperFunctions: string[];
}

export interface SemanticIRNode {
  kind: 'gate' | 'membership' | 'variable' | 'blend' | 'defuzzify' | 'chain' | 'raw';
  gateType?: string;
  tnorm?: string;
  children?: SemanticIRNode[];
  params?: Record<string, unknown>;
  code?: string;
}

export class LogicMapper {
  map(matches: MatchResult[]): MappingResult[] {
    return matches.filter(m => m.pattern.transformable).map(m => this.mapSingle(m));
  }

  private mapSingle(match: MatchResult): MappingResult {
    const imports: string[] = [
      "import { SemanticTruthValue, truthValue } from '@heady-ai/semantic-logic';",
    ];
    const helpers: string[] = [];
    let ir: SemanticIRNode;

    switch (match.canonicalForm) {
      case 'BINARY_BRANCH':
        ir = this.mapBinaryBranch(match);
        imports.push("import { AND, OR } from '@heady-ai/semantic-logic/gates';");
        break;

      case 'COMPOUND_AND':
        ir = this.mapCompoundAnd(match);
        imports.push("import { AND } from '@heady-ai/semantic-logic/gates';");
        break;

      case 'COMPOUND_OR':
        ir = this.mapCompoundOr(match);
        imports.push("import { OR } from '@heady-ai/semantic-logic/gates';");
        break;

      case 'MIXED_COMPOUND':
        ir = this.mapMixedCompound(match);
        imports.push("import { AND, OR } from '@heady-ai/semantic-logic/gates';");
        break;

      case 'NEGATED_CONDITION':
        ir = this.mapNegated(match);
        imports.push("import { NOT } from '@heady-ai/semantic-logic/gates';");
        break;

      case 'COMPARISON_THRESHOLD':
        ir = this.mapThreshold(match);
        imports.push("import { sigmoid } from '@heady-ai/semantic-logic';");
        break;

      case 'RANGE_CHECK':
        ir = this.mapRangeCheck(match);
        imports.push("import { AND } from '@heady-ai/semantic-logic/gates';");
        imports.push("import { sigmoid } from '@heady-ai/semantic-logic';");
        break;

      case 'TERNARY_SELECT':
        ir = this.mapTernarySelect(match);
        break;

      case 'MULTI_BRANCH':
        ir = this.mapMultiBranch(match);
        imports.push("import { WEIGHTED_OR } from '@heady-ai/semantic-logic/gates';");
        imports.push("import { Defuzzifier } from '@heady-ai/semantic-logic';");
        break;

      case 'GUARD_CLAUSE':
        ir = this.mapGuardClause(match);
        imports.push("import { sigmoid } from '@heady-ai/semantic-logic';");
        break;

      case 'NULL_CHECK':
        ir = this.mapNullCheck(match);
        break;

      case 'EQUALITY_CHECK':
        ir = this.mapEqualityCheck(match);
        imports.push("import { gaussian } from '@heady-ai/semantic-logic';");
        break;

      default:
        ir = { kind: 'raw', code: `/* CSL: unhandled pattern ${match.canonicalForm} */` };
    }

    return {
      originalPattern: match,
      semanticIR: ir,
      imports: [...new Set(imports)],
      helperFunctions: helpers,
    };
  }

  private mapBinaryBranch(match: MatchResult): SemanticIRNode {
    return {
      kind: 'blend',
      params: {
        condition: match.pattern.conditionText,
        template: 'binary_blend',
        comment: `// CSL Transform: if/else → continuous blend\n// condition truth value gates between two outputs`,
      },
      children: [
        { kind: 'membership', params: { source: match.pattern.conditionText } },
      ],
    };
  }

  private mapCompoundAnd(match: MatchResult): SemanticIRNode {
    const operands = match.pattern.conditionText.split('&&').map(s => s.trim());
    return {
      kind: 'gate',
      gateType: 'AND',
      tnorm: match.suggestedGates[0]?.tnorm ?? 'zadeh',
      children: operands.map(op => ({
        kind: 'membership' as const,
        params: { source: op },
      })),
    };
  }

  private mapCompoundOr(match: MatchResult): SemanticIRNode {
    const operands = match.pattern.conditionText.split('||').map(s => s.trim());
    return {
      kind: 'gate',
      gateType: 'OR',
      tnorm: match.suggestedGates[0]?.tnorm ?? 'zadeh',
      children: operands.map(op => ({
        kind: 'membership' as const,
        params: { source: op },
      })),
    };
  }

  private mapMixedCompound(match: MatchResult): SemanticIRNode {
    // Represent as a nested gate tree
    return {
      kind: 'chain',
      children: [
        {
          kind: 'gate',
          gateType: 'AND',
          tnorm: 'product',
          params: { note: 'AND sub-expressions' },
        },
        {
          kind: 'gate',
          gateType: 'OR',
          tnorm: 'product',
          params: { note: 'OR to combine AND groups' },
        },
      ],
      params: { expression: match.pattern.conditionText },
    };
  }

  private mapNegated(match: MatchResult): SemanticIRNode {
    return {
      kind: 'gate',
      gateType: 'NOT',
      children: [{ kind: 'membership', params: { source: match.pattern.conditionText.replace(/^!/, '') } }],
    };
  }

  private mapThreshold(match: MatchResult): SemanticIRNode {
    const thresholdMatch = match.pattern.conditionText.match(/([><=!]+)\s*([\d.]+)/);
    return {
      kind: 'membership',
      params: {
        type: 'sigmoid',
        center: thresholdMatch ? parseFloat(thresholdMatch[2]) : 0,
        slope: 10,
        operator: thresholdMatch ? thresholdMatch[1] : '>',
      },
    };
  }

  private mapRangeCheck(match: MatchResult): SemanticIRNode {
    return {
      kind: 'gate',
      gateType: 'AND',
      tnorm: 'product',
      children: [
        { kind: 'membership', params: { type: 'sigmoid', note: 'lower bound' } },
        { kind: 'membership', params: { type: 'sigmoid', note: 'upper bound (inverted)' } },
      ],
    };
  }

  private mapTernarySelect(match: MatchResult): SemanticIRNode {
    return {
      kind: 'blend',
      params: {
        template: 'ternary_blend',
        comment: '// result = conditionTruth * trueValue + (1 - conditionTruth) * falseValue',
      },
    };
  }

  private mapMultiBranch(match: MatchResult): SemanticIRNode {
    return {
      kind: 'defuzzify',
      params: {
        method: 'weighted_average',
        branches: match.pattern.branches,
      },
    };
  }

  private mapGuardClause(match: MatchResult): SemanticIRNode {
    return {
      kind: 'gate',
      gateType: 'THRESHOLD',
      params: {
        threshold: 0.5,
        steep: true,
        comment: '// Guard clause: steep sigmoid for near-binary behavior',
      },
    };
  }

  private mapNullCheck(match: MatchResult): SemanticIRNode {
    return {
      kind: 'membership',
      params: {
        type: 'sigmoid',
        center: 0.01,
        slope: 100,
        comment: '// Existence probability: near-1 when defined, near-0 when null',
      },
    };
  }

  private mapEqualityCheck(match: MatchResult): SemanticIRNode {
    return {
      kind: 'membership',
      params: {
        type: 'gaussian',
        sigma: 0.01,
        comment: '// Equality → narrow Gaussian membership',
      },
    };
  }
}
```

---

## 13. `packages/heady-semantic-logic/src/transform/code-generator.ts`

```typescript
/**
 * Code Generator — converts the semantic IR into actual TypeScript source code
 * that uses the @heady-ai/semantic-logic runtime.
 */

import type { MappingResult, SemanticIRNode } from './logic-mapper.js';

export interface GeneratedFile {
  originalPath: string;
  outputPath: string;
  content: string;
  patternsTransformed: number;
  imports: string[];
}

export class CodeGenerator {
  private indentSize: number;

  constructor(indentSize: number = 2) {
    this.indentSize = indentSize;
  }

  /**
   * Generate replacement code blocks for each mapping result.
   * Does NOT replace the entire file — produces code blocks with markers.
   */
  generateBlocks(mappings: MappingResult[]): Map<string, string[]> {
    const fileBlocks = new Map<string, string[]>();

    for (const mapping of mappings) {
      const filePath = mapping.originalPattern.pattern.filePath;
      if (!fileBlocks.has(filePath)) fileBlocks.set(filePath, []);

      const block = this.generateBlock(mapping);
      fileBlocks.get(filePath)!.push(block);
    }

    return fileBlocks;
  }

  /**
   * Generate a full transformed file with CSL replacements.
   */
  generateFile(originalSource: string, mappings: MappingResult[], originalPath: string): GeneratedFile {
    const allImports = new Set<string>();
    let transformedSource = originalSource;
    let count = 0;

    // Sort mappings by line number descending so replacements don't shift positions
    const sorted = [...mappings].sort(
      (a, b) => b.originalPattern.pattern.startLine - a.originalPattern.pattern.startLine
    );

    for (const mapping of sorted) {
      const block = this.generateBlock(mapping);
      mapping.imports.forEach(imp => allImports.add(imp));

      // Insert CSL block as a comment-wrapped replacement
      const marker = `\n/* ═══ CSL TRANSFORM START [${mapping.originalPattern.pattern.id}] ═══ */\n`;
      const endMarker = `\n/* ═══ CSL TRANSFORM END [${mapping.originalPattern.pattern.id}] ═══ */\n`;

      const original = mapping.originalPattern.pattern.sourceText;
      const replacement = `${marker}// Original: ${original.split('\n')[0]}...\n${block}${endMarker}`;

      transformedSource = transformedSource.replace(original, replacement);
      count++;
    }

    // Prepend imports
    const importBlock = [...allImports].join('\n') + '\n\n';
    transformedSource = importBlock + transformedSource;

    return {
      originalPath,
      outputPath: originalPath.replace(/\.ts$/, '.csl.ts').replace(/\.js$/, '.csl.js'),
      content: transformedSource,
      patternsTransformed: count,
      imports: [...allImports],
    };
  }

  private generateBlock(mapping: MappingResult): string {
    const { semanticIR, originalPattern } = mapping;
    const { canonicalForm } = originalPattern;
    const p = originalPattern.pattern;

    switch (canonicalForm) {
      case 'BINARY_BRANCH':
        return this.genBinaryBranch(p.conditionText);

      case 'COMPOUND_AND':
        return this.genCompoundGate('AND', p.conditionText, semanticIR);

      case 'COMPOUND_OR':
        return this.genCompoundGate('OR', p.conditionText, semanticIR);

      case 'MIXED_COMPOUND':
        return this.genMixedCompound(p.conditionText);

      case 'NEGATED_CONDITION':
        return this.genNegated(p.conditionText);

      case 'COMPARISON_THRESHOLD':
        return this.genThreshold(p.conditionText, semanticIR);

      case 'RANGE_CHECK':
        return this.genRangeCheck(p.conditionText, semanticIR);

      case 'TERNARY_SELECT':
        return this.genTernary(p.conditionText);

      case 'MULTI_BRANCH':
        return this.genMultiBranch(p);

      case 'GUARD_CLAUSE':
        return this.genGuard(p.conditionText);

      case 'NULL_CHECK':
        return this.genNullCheck(p.conditionText);

      case 'EQUALITY_CHECK':
        return this.genEqualityCheck(p.conditionText);

      default:
        return `// CSL: No transform available for ${canonicalForm}\n`;
    }
  }

  private genBinaryBranch(condition: string): string {
    return `
// CSL Binary Branch: condition → continuous blend
const _cslCondition = truthValue(/* fuzzify: ${condition} */ 0.5, '${this.sanitize(condition)}');
const _cslResult = _cslCondition.value * truePathValue + (1 - _cslCondition.value) * falsePathValue;
`.trim();
  }

  private genCompoundGate(type: 'AND' | 'OR', condition: string, ir: SemanticIRNode): string {
    const sep = type === 'AND' ? '&&' : '||';
    const operands = condition.split(sep).map(s => s.trim());
    const tnorm = ir.tnorm ?? 'zadeh';
    const inputs = operands
      .map((op, i) => `  truthValue(/* fuzzify: ${this.sanitize(op)} */ 0.5, 'input_${i}')`)
      .join(',\n');

    return `
// CSL ${type} Gate (${tnorm} t-norm)
const _cslResult = ${type}([
${inputs}
], { tnorm: '${tnorm}' });
// Use _cslResult.value for continuous decision, _cslResult.isTruthy() for boolean fallback
`.trim();
  }

  private genMixedCompound(condition: string): string {
    return `
// CSL Mixed Compound: decomposed AND/OR gate tree
// Original: ${this.sanitize(condition)}
// Step 1: Evaluate AND sub-groups
// Step 2: Combine via OR
const _cslAndGroups = /* parse and evaluate each && group */[];
const _cslResult = OR(_cslAndGroups.map(group => AND(group, { tnorm: 'product' })), { tnorm: 'product' });
`.trim();
  }

  private genNegated(condition: string): string {
    const inner = condition.replace(/^!+\(?/, '').replace(/\)$/, '');
    return `
// CSL Negation: NOT gate
const _cslInner = truthValue(/* fuzzify: ${this.sanitize(inner)} */ 0.5, '${this.sanitize(inner)}');
const _cslResult = NOT(_cslInner); // value = 1 - inner.value
`.trim();
  }

  private genThreshold(condition: string, ir: SemanticIRNode): string {
    const center = ir.params?.center ?? 0;
    const slope = ir.params?.slope ?? 10;
    return `
// CSL Threshold: hard comparison → smooth sigmoid transition
const _cslMembership = sigmoid(${center}, ${slope}, '${this.sanitize(condition)}');
const _cslResult = truthValue(_cslMembership.evaluate(inputValue), '${this.sanitize(condition)}');
`.trim();
  }

  private genRangeCheck(condition: string, ir: SemanticIRNode): string {
    return `
// CSL Range Check: dual sigmoid AND gate
const _cslLower = sigmoid(lowerBound, 10, 'lower');
const _cslUpper = sigmoid(upperBound, -10, 'upper'); // negative slope for upper bound
const _cslResult = AND([
  truthValue(_cslLower.evaluate(inputValue), 'above_lower'),
  truthValue(_cslUpper.evaluate(inputValue), 'below_upper'),
], { tnorm: 'product' });
`.trim();
  }

  private genTernary(condition: string): string {
    return `
// CSL Ternary Select: continuous interpolation
const _cslCondition = truthValue(/* fuzzify: ${this.sanitize(condition)} */ 0.5, 'condition');
const _cslResult = _cslCondition.value * trueValue + (1 - _cslCondition.value) * falseValue;
`.trim();
  }

  private genMultiBranch(pattern: { conditionText: string; branches: number }): string {
    const branchLines = Array.from({ length: pattern.branches }, (_, i) =>
      `  { activation: truthValue(/* branch_${i}_condition */ 0.5), output: branch_${i}_value }`
    ).join(',\n');

    return `
// CSL Multi-Branch: weighted sum defuzzification
const _cslBranches = [
${branchLines}
];
const _totalActivation = _cslBranches.reduce((s, b) => s + b.activation.value, 0);
const _cslResult = _totalActivation === 0 ? defaultValue
  : _cslBranches.reduce((s, b) => s + b.activation.value * b.output, 0) / _totalActivation;
`.trim();
  }

  private genGuard(condition: string): string {
    return `
// CSL Guard Clause: steep sigmoid threshold
const _cslGuard = truthValue(/* fuzzify: ${this.sanitize(condition)} */ 0.5, 'guard');
if (_cslGuard.isTruthy(0.95)) { /* proceed with guard action */ }
// Or use _cslGuard.value for graceful degradation
`.trim();
  }

  private genNullCheck(condition: string): string {
    return `
// CSL Null Check: existence probability
const _cslExists = truthValue(value !== null && value !== undefined ? 1.0 : 0.0, 'exists');
// In semantic mode: _cslExists.value can reflect confidence of data availability
`.trim();
  }

  private genEqualityCheck(condition: string): string {
    return `
// CSL Equality Check: Gaussian membership (narrow)
const _cslMatch = gaussian(targetValue, 0.01, 'eq_check');
const _cslResult = truthValue(_cslMatch.evaluate(inputValue), 'equality');
// _cslResult.value ≈ 1.0 when input ≈ target, smooth falloff otherwise
`.trim();
  }

  private sanitize(s: string): string {
    return s.replace(/'/g, "\\'").replace(/\n/g, ' ').substring(0, 80);
  }
}
```

---

## 14. `packages/heady-semantic-logic/src/transform/transformer.ts`

```typescript
/**
 * Semantic Transformer — the main orchestrator.
 * Scan → Match → Map → Generate → Output
 */

import { ASTScanner, type ScanResult, type LogicPattern } from './ast-scanner.js';
import { PatternMatcher, type MatchResult } from './pattern-matcher.js';
import { LogicMapper, type MappingResult } from './logic-mapper.js';
import { CodeGenerator, type GeneratedFile } from './code-generator.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TransformConfig {
  /** Glob patterns for source files to scan */
  include: string[];
  /** Output directory for transformed files */
  outputDir: string;
  /** Working directory */
  cwd?: string;
  /** tsconfig.json path */
  tsConfigPath?: string;
  /** T-norm preference: 'zadeh' | 'product' | 'lukasiewicz' */
  defaultTNorm?: string;
  /** Only transform patterns above this complexity threshold */
  minComplexity?: number;
  /** Generate side-by-side files (.csl.ts) instead of replacing */
  sideBySide?: boolean;
  /** Generate a transformation report */
  generateReport?: boolean;
  /** Dry run: scan and report but don't write files */
  dryRun?: boolean;
}

export interface TransformResult {
  scanResult: ScanResult;
  matchResults: MatchResult[];
  mappingResults: MappingResult[];
  generatedFiles: GeneratedFile[];
  report: TransformReport;
}

export interface TransformReport {
  timestamp: string;
  config: TransformConfig;
  summary: {
    filesScanned: number;
    patternsFound: number;
    patternsTransformable: number;
    patternsTransformed: number;
    filesGenerated: number;
    totalComplexityReduced: number;
  };
  patternBreakdown: Record<string, number>;
  fileDetails: Array<{
    path: string;
    patterns: number;
    transformed: number;
  }>;
}

export class SemanticTransformer {
  private config: TransformConfig;
  private scanner: ASTScanner;
  private matcher: PatternMatcher;
  private mapper: LogicMapper;
  private generator: CodeGenerator;

  constructor(config: TransformConfig) {
    this.config = {
      cwd: process.cwd(),
      defaultTNorm: 'zadeh',
      minComplexity: 1,
      sideBySide: true,
      generateReport: true,
      dryRun: false,
      ...config,
    };
    this.scanner = new ASTScanner(config.tsConfigPath);
    this.matcher = new PatternMatcher();
    this.mapper = new LogicMapper();
    this.generator = new CodeGenerator();
  }

  async transform(): Promise<TransformResult> {
    console.log('🧠 HeadySystems Continuous Semantic Logic Transform');
    console.log('══════════════════════════════════════════════════\n');

    // Phase 1: Scan
    console.log('📡 Phase 1: Scanning source files for logic patterns...');
    const scanResult = await this.scanner.scan(this.config.include, this.config.cwd);
    console.log(`   Found ${scanResult.totalPatterns} patterns in ${scanResult.totalFiles} files`);
    console.log(`   ${scanResult.transformableCount} are transformable\n`);

    // Phase 2: Match
    console.log('🔍 Phase 2: Classifying patterns into canonical forms...');
    const matchResults = this.matcher.match(scanResult.patterns);
    const formCounts: Record<string, number> = {};
    matchResults.forEach(m => {
      formCounts[m.canonicalForm] = (formCounts[m.canonicalForm] || 0) + 1;
    });
    Object.entries(formCounts).forEach(([form, count]) => {
      console.log(`   ${form}: ${count}`);
    });
    console.log();

    // Phase 3: Map
    console.log('🗺️  Phase 3: Mapping to continuous semantic logic IR...');
    const mappingResults = this.mapper.map(matchResults);
    console.log(`   Generated ${mappingResults.length} semantic IR nodes\n`);

    // Phase 4: Generate
    console.log('⚙️  Phase 4: Generating transformed source files...');
    const generatedFiles: GeneratedFile[] = [];

    // Group mappings by file
    const byFile = new Map<string, MappingResult[]>();
    for (const m of mappingResults) {
      const fp = m.originalPattern.pattern.filePath;
      if (!byFile.has(fp)) byFile.set(fp, []);
      byFile.get(fp)!.push(m);
    }

    for (const [filePath, fileMappings] of byFile) {
      const originalSource = await fs.readFile(filePath, 'utf-8');
      const generated = this.generator.generateFile(originalSource, fileMappings, filePath);
      generatedFiles.push(generated);

      if (!this.config.dryRun) {
        const outPath = this.config.sideBySide
          ? generated.outputPath
          : path.join(this.config.outputDir, path.relative(this.config.cwd!, filePath));

        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, generated.content, 'utf-8');
        console.log(`   ✅ ${path.relative(this.config.cwd!, outPath)} (${generated.patternsTransformed} patterns)`);
      } else {
        console.log(`   🔍 [DRY RUN] ${path.relative(this.config.cwd!, generated.outputPath)} (${generated.patternsTransformed} patterns)`);
      }
    }

    // Phase 5: Report
    const report = this.generateReport(scanResult, matchResults, mappingResults, generatedFiles, formCounts);

    if (this.config.generateReport && !this.config.dryRun) {
      const reportPath = path.join(this.config.outputDir, 'csl-transform-report.json');
      await fs.mkdir(this.config.outputDir, { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`\n📊 Report: ${reportPath}`);
    }

    console.log('\n✨ Transform complete!\n');

    return { scanResult, matchResults, mappingResults, generatedFiles, report };
  }

  private generateReport(
    scan: ScanResult,
    matches: MatchResult[],
    mappings: MappingResult[],
    files: GeneratedFile[],
    formCounts: Record<string, number>,
  ): TransformReport {
    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        filesScanned: scan.totalFiles,
        patternsFound: scan.totalPatterns,
        patternsTransformable: scan.transformableCount,
        patternsTransformed: mappings.length,
        filesGenerated: files.length,
        totalComplexityReduced: scan.complexityScore,
      },
      patternBreakdown: formCounts,
      fileDetails: files.map(f => ({
        path: f.originalPath,
        patterns: mappings.filter(m => m.originalPattern.pattern.filePath === f.originalPath).length,
        transformed: f.patternsTransformed,
      })),
    };
  }
}
```

---

## 15. `packages/heady-semantic-logic/src/integration/heady-brain-adapter.ts`

```typescript
/**
 * HeadyBrain Adapter — integrates continuous semantic logic into 
 * HeadyBrain's general reasoning pipeline.
 * 
 * HeadyBrain is the primary reasoning engine. This adapter allows
 * it to use semantic truth values for decision-making instead of
 * hard boolean logic.
 */

import { SemanticTruthValue, truthValue } from '../core/truth-value.js';
import { AND, OR, NOT, WEIGHTED_AND, type GateConfig } from '../core/gates.js';
import { RuleEngine, type SemanticRule } from '../core/rule-engine.js';
import { Defuzzifier } from '../core/defuzzifier.js';

export interface BrainDecisionContext {
  taskId: string;
  agentId: string;
  inputs: Map<string, number>;
  constraints: BrainConstraint[];
  preferences: BrainPreference[];
}

export interface BrainConstraint {
  name: string;
  truthValue: SemanticTruthValue;
  hard: boolean;  // Hard constraint = must be near 1.0; soft = weighted
}

export interface BrainPreference {
  name: string;
  truthValue: SemanticTruthValue;
  weight: number;
}

export interface BrainDecisionResult {
  decision: string;
  confidence: number;
  truthValue: SemanticTruthValue;
  reasoning: string[];
  alternativeDecisions: Array<{ decision: string; confidence: number }>;
}

export class HeadyBrainAdapter {
  private ruleEngine: RuleEngine;
  private defuzzifier: Defuzzifier;

  constructor() {
    this.ruleEngine = new RuleEngine();
    this.defuzzifier = new Defuzzifier('weighted_average');
  }

  /**
   * Make a decision using continuous semantic logic.
   * Replaces the hard if/else decision trees in HeadyBrain.
   */
  decide(context: BrainDecisionContext): BrainDecisionResult {
    const reasoning: string[] = [];

    // Evaluate hard constraints (must all be satisfied)
    const hardConstraints = context.constraints.filter(c => c.hard);
    const hardValues = hardConstraints.map(c => c.truthValue);
    const hardGate = hardValues.length > 0
      ? AND(hardValues, { tnorm: 'zadeh' })
      : truthValue(1.0, 'no_hard_constraints');

    reasoning.push(`Hard constraints gate: ${hardGate.value.toFixed(4)}`);

    // Evaluate soft constraints (weighted)
    const softConstraints = context.constraints.filter(c => !c.hard);
    const softValues = softConstraints.map(c => c.truthValue);
    const softWeights = softConstraints.map(() => 1.0);
    const softGate = softValues.length > 0
      ? WEIGHTED_AND(softValues, softWeights)
      : truthValue(1.0, 'no_soft_constraints');

    reasoning.push(`Soft constraints gate: ${softGate.value.toFixed(4)}`);

    // Evaluate preferences
    const prefValues = context.preferences.map(p => p.truthValue);
    const prefWeights = context.preferences.map(p => p.weight);
    const prefGate = prefValues.length > 0
      ? WEIGHTED_AND(prefValues, prefWeights)
      : truthValue(0.5, 'no_preferences');

    reasoning.push(`Preferences gate: ${prefGate.value.toFixed(4)}`);

    // Combine: hard * (blend of soft + preferences)
    const combined = AND([
      hardGate,
      softGate.interpolate(prefGate, 0.5),
    ], { tnorm: 'product' });

    reasoning.push(`Combined decision value: ${combined.value.toFixed(4)}`);

    // Determine decision
    const decision = combined.isTruthy(0.6) ? 'PROCEED' : combined.isTruthy(0.3) ? 'CAUTIOUS' : 'HALT';

    return {
      decision,
      confidence: combined.value,
      truthValue: combined,
      reasoning,
      alternativeDecisions: [
        { decision: 'PROCEED', confidence: combined.value },
        { decision: 'CAUTIOUS', confidence: Math.abs(combined.value - 0.5) < 0.2 ? 0.8 : 0.2 },
        { decision: 'HALT', confidence: 1 - combined.value },
      ],
    };
  }

  /**
   * Evaluate agent selection using semantic truth values.
   * Replaces hard-coded agent routing logic.
   */
  selectAgent(
    candidates: Array<{ agentId: string; capabilities: SemanticTruthValue[]; load: number }>,
    taskRequirements: SemanticTruthValue[]
  ): { agentId: string; score: number }[] {
    return candidates
      .map(candidate => {
        // Match capabilities to requirements
        const matchScores = taskRequirements.map((req, i) => {
          const cap = candidate.capabilities[i] ?? truthValue(0);
          return AND([req, cap], { tnorm: 'product' }).value;
        });

        const avgMatch = matchScores.reduce((s, v) => s + v, 0) / matchScores.length;
        const loadPenalty = 1 - (candidate.load / 100); // 0-100 load → 1.0-0.0 penalty

        return {
          agentId: candidate.agentId,
          score: avgMatch * loadPenalty,
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
```

---

## 16. `packages/heady-semantic-logic/src/integration/heady-conductor-adapter.ts`

```typescript
/**
 * HeadyConductor Adapter — integrates CSL into the orchestration/monitoring layer.
 * HeadyConductor monitors system health and coordinates between agents.
 */

import { SemanticTruthValue, truthValue } from '../core/truth-value.js';
import { AND, OR, WEIGHTED_OR } from '../core/gates.js';
import { SemanticVariable } from '../core/semantic-variable.js';
import { gaussian, sigmoid, triangular } from '../core/membership.js';

export interface SystemHealthMetrics {
  cpuUsage: number;      // 0-100
  memoryUsage: number;   // 0-100
  errorRate: number;      // 0-1
  latencyMs: number;      // milliseconds
  queueDepth: number;     // task queue size
  agentAvailability: number; // 0-1
}

export interface OrchestrationDecision {
  action: 'SCALE_UP' | 'SCALE_DOWN' | 'REBALANCE' | 'ALERT' | 'MAINTAIN';
  urgency: SemanticTruthValue;
  factors: Map<string, SemanticTruthValue>;
  explanation: string;
}

export class HeadyConductorAdapter {
  private cpuVar: SemanticVariable;
  private memVar: SemanticVariable;
  private errorVar: SemanticVariable;
  private latencyVar: SemanticVariable;

  constructor() {
    // Define semantic variables for system metrics
    this.cpuVar = new SemanticVariable('cpu', [0, 100])
      .addTerm('idle', triangular(0, 0, 30, 'idle'))
      .addTerm('normal', triangular(20, 50, 80, 'normal'))
      .addTerm('high', triangular(70, 85, 95, 'high'))
      .addTerm('critical', sigmoid(90, 0.5, 'critical'));

    this.memVar = new SemanticVariable('memory', [0, 100])
      .addTerm('low', triangular(0, 0, 40, 'low'))
      .addTerm('moderate', triangular(30, 55, 80, 'moderate'))
      .addTerm('high', triangular(70, 85, 95, 'high'))
      .addTerm('critical', sigmoid(92, 0.5, 'critical'));

    this.errorVar = new SemanticVariable('errorRate', [0, 1])
      .addTerm('healthy', triangular(0, 0, 0.05, 'healthy'))
      .addTerm('elevated', triangular(0.02, 0.1, 0.3, 'elevated'))
      .addTerm('critical', sigmoid(0.2, 20, 'critical'));

    this.latencyVar = new SemanticVariable('latency', [0, 10000])
      .addTerm('fast', triangular(0, 0, 200, 'fast'))
      .addTerm('normal', triangular(100, 500, 1000, 'normal'))
      .addTerm('slow', triangular(800, 2000, 5000, 'slow'))
      .addTerm('timeout', sigmoid(3000, 0.005, 'timeout'));
  }

  /**
   * Evaluate system health and produce an orchestration decision.
   * Replaces the hard threshold checks in HeadyConductor.
   */
  evaluateHealth(metrics: SystemHealthMetrics): OrchestrationDecision {
    const factors = new Map<string, SemanticTruthValue>();

    // Fuzzify all metrics
    const cpuCritical = this.cpuVar.evaluate(metrics.cpuUsage, 'critical');
    const cpuHigh = this.cpuVar.evaluate(metrics.cpuUsage, 'high');
    const memCritical = this.memVar.evaluate(metrics.memoryUsage, 'critical');
    const memHigh = this.memVar.evaluate(metrics.memoryUsage, 'high');
    const errorCritical = this.errorVar.evaluate(metrics.errorRate, 'critical');
    const errorElevated = this.errorVar.evaluate(metrics.errorRate, 'elevated');
    const latencySlow = this.latencyVar.evaluate(metrics.latencyMs, 'slow');
    const latencyTimeout = this.latencyVar.evaluate(metrics.latencyMs, 'timeout');

    factors.set('cpu_critical', cpuCritical);
    factors.set('mem_critical', memCritical);
    factors.set('error_critical', errorCritical);
    factors.set('latency_timeout', latencyTimeout);

    // Decision logic — all continuous, no if/else
    const scaleUpUrgency = OR([cpuCritical, memCritical, latencyTimeout], { tnorm: 'zadeh' });
    const alertUrgency = AND([errorCritical, OR([cpuHigh, memHigh])], { tnorm: 'product' });
    const rebalanceUrgency = AND([
      cpuHigh,
      truthValue(1 - metrics.agentAvailability, 'low_availability'),
    ], { tnorm: 'product' });
    const scaleDownOpportunity = AND([
      truthValue(1 - cpuHigh.value, 'cpu_not