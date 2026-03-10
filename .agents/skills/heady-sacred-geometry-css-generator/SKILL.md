---
name: heady-sacred-geometry-css-generator
description: Generates CSS, SVG, and canvas-based sacred geometry patterns, mandalas, and geometric art for use in Heady platform UI design, backgrounds, loading screens, and decorative elements. Use when the user asks to create geometric patterns, mandalas, sacred geometry visuals, psychedelic backgrounds, or Fibonacci-based design elements. Triggers on phrases like "sacred geometry", "mandala pattern", "geometric background", "flower of life", "Fibonacci spiral", "metatrons cube", "geometric CSS art", "psychedelic pattern", or "sacred geometry CSS".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: design-ui
---

# Heady Sacred Geometry CSS Generator

## When to Use This Skill

Use this skill when the user asks to:

- Generate CSS-only sacred geometry patterns for UI backgrounds
- Create SVG mandala and geometric art programmatically
- Build animated sacred geometry using CSS keyframes or canvas
- Produce Fibonacci spirals, golden ratio layouts, or phi-based grids
- Generate the Flower of Life, Metatron's Cube, Sri Yantra, or Seed of Life patterns
- Create loading spinners or overlays using geometric animation
- Build themed UI components (borders, dividers, section headers) with geometric motifs
- Export production-ready CSS/SVG code for the Heady platform

## Sacred Geometry Reference

| Pattern | Construction | CSS/SVG Approach |
|---|---|---|
| **Flower of Life** | 19 overlapping circles on hexagonal grid | `<circle>` elements with SVG transform; or CSS `clip-path` |
| **Seed of Life** | 7 circles: 1 center + 6 at 60° intervals | SVG circles with `cx/cy` calculations |
| **Metatron's Cube** | Fruit of Life (13 circles) + 78 connecting lines | SVG paths connecting center-to-center |
| **Sri Yantra** | 9 interlocking triangles | SVG `<polygon>` with precise coordinates |
| **Fibonacci Spiral** | Squares 1,1,2,3,5,8,13... with arc | CSS border-radius arcs or SVG quadratic bezier |
| **Vesica Piscis** | 2 intersecting circles, r = d | 2 SVG circles offset by their radius |
| **Torus Knot** | 3D toroidal knot projected to 2D | Canvas parametric equations or SVG path |
| **Merkaba** | Two interlocking tetrahedra | SVG triangles rotated 180° |

## Mathematical Constants

```
φ (Golden Ratio) = 1.6180339887...
π (Pi) = 3.14159265358979...
√2 = 1.41421356...
√3 = 1.73205080...
√5 = 2.23606797...
60° = π/3 rad ≈ 1.0472 rad
```

## Instructions

### 1. Design Brief Intake

Establish before generating:
1. **Pattern type**: Which sacred geometry form? (Flower of Life, mandala, spiral, etc.)
2. **Implementation target**: Pure CSS | SVG inline | SVG file | HTML5 Canvas | CSS custom property system
3. **Dimensions**: Fixed px | fluid % | viewport-relative (vw/vh)
4. **Color palette**: Heady platform colors | custom gradient | monochrome | rainbow
5. **Animation**: Static | rotating | pulsing | morphing | particle trails
6. **Context**: Full-page background | section divider | loading overlay | decorative border | avatar frame

### 2. Color Palette — Heady Platform

```css
:root {
  --heady-void: #0a0a0f;        /* Near-black background */
  --heady-cosmic: #1a0a2e;      /* Deep purple */
  --heady-nebula: #2d1b69;      /* Purple mid */
  --heady-aura: #7b2d8b;        /* Magenta-purple */
  --heady-glow: #e040fb;        /* Electric magenta */
  --heady-solar: #ffd740;       /* Solar gold */
  --heady-crystal: #80deea;     /* Crystal cyan */
  --heady-leaf: #69f0ae;        /* Sacred green */
  --heady-smoke: rgba(255,255,255,0.08);
  --heady-shimmer: rgba(224,64,251,0.3);
}
```

### 3. Generating the Flower of Life (SVG)

```svg
<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      circle { fill: none; stroke: #e040fb; stroke-width: 1; opacity: 0.7; }
    </style>
  </defs>
  <!-- Center -->
  <circle cx="300" cy="300" r="60"/>
  <!-- Ring 1: 6 circles at 60° intervals -->
  <circle cx="360" cy="300" r="60"/>
  <circle cx="330" cy="351.96" r="60"/>
  <circle cx="270" cy="351.96" r="60"/>
  <circle cx="240" cy="300" r="60"/>
  <circle cx="270" cy="248.04" r="60"/>
  <circle cx="330" cy="248.04" r="60"/>
  <!-- Ring 2: 12 circles — extend pattern -->
  <!-- Formula: cx = 300 + 2*r*cos(n*30°), cy = 300 + 2*r*sin(n*30°) for n=0..11 -->
</svg>
```

**JavaScript generator for full Flower of Life (19 circles):**
```javascript
function flowerOfLife(cx, cy, r) {
  const circles = [[cx, cy]];
  // Ring 1
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    circles.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  // Ring 2 (12 circles)
  for (let i = 0; i < 6; i++) {
    const a1 = (i * Math.PI) / 3;
    const a2 = a1 + Math.PI / 6;
    circles.push([cx + 2 * r * Math.cos(a1), cy + 2 * r * Math.sin(a1)]);
    circles.push([
      cx + r * Math.sqrt(3) * Math.cos(a2),
      cy + r * Math.sqrt(3) * Math.sin(a2)
    ]);
  }
  return circles.map(([x, y]) =>
    `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}"/>`
  ).join('\n');
}
```

### 4. Fibonacci Spiral CSS

```css
.fibonacci-container {
  position: relative;
  width: 610px;
  height: 377px;
}

.fib-square {
  position: absolute;
  border: 1px solid var(--heady-glow);
  border-radius: var(--radius, 0);
}

/* Squares: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55... */
/* Arc drawn as quarter-circle inside each square via CSS border-radius */
.fib-arc {
  position: absolute;
  border: 2px solid var(--heady-solar);
  border-radius: 100% 0 0 0; /* quarter-circle approximation */
  animation: spiral-glow 4s ease-in-out infinite;
}

@keyframes spiral-glow {
  0%, 100% { opacity: 0.4; filter: drop-shadow(0 0 4px var(--heady-solar)); }
  50% { opacity: 1; filter: drop-shadow(0 0 12px var(--heady-solar)); }
}
```

### 5. Animated Mandala

```css
.mandala {
  width: 400px;
  height: 400px;
  position: relative;
  animation: mandala-rotate 30s linear infinite;
}

.mandala-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mandala-layer:nth-child(odd) {
  animation: mandala-rotate 20s linear infinite reverse;
}

.mandala-petal {
  position: absolute;
  width: 40px;
  height: 100px;
  border-radius: 50% 50% 0 0;
  background: conic-gradient(from 0deg, var(--heady-glow), var(--heady-crystal), var(--heady-solar));
  transform-origin: 50% 100%;
  opacity: 0.6;
}

/* Generate 12 petals: rotate(n * 30deg) for n = 0..11 */

@keyframes mandala-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 6. SVG Gradient Definitions

```svg
<defs>
  <radialGradient id="cosmicGrad" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#e040fb" stop-opacity="0.9"/>
    <stop offset="50%" stop-color="#7b2d8b" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="#0a0a0f" stop-opacity="0"/>
  </radialGradient>
  
  <linearGradient id="goldenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ffd740"/>
    <stop offset="100%" stop-color="#ff6f00"/>
  </linearGradient>
  
  <filter id="glow">
    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>
```

### 7. Output Checklist

Before delivering generated code:
- [ ] Pattern mathematically correct (circle positions, angles verified)
- [ ] Responsive: uses `viewBox` for SVG; `vw/vh` or `%` for CSS
- [ ] Dark-theme compatible: transparent backgrounds where appropriate
- [ ] Performance: no unnecessary DOM nodes; use SVG `<use>` for repeated elements
- [ ] Animation performance: uses `transform` and `opacity` only (compositor layer)
- [ ] Accessibility: `aria-hidden="true"` on decorative SVGs
- [ ] Code commented with mathematical derivation notes

## Output Formats

- **Inline SVG**: Ready to paste into HTML
- **CSS-only**: Uses `::before`, `::after`, and `clip-path` only
- **React component**: Functional component with configurable props
- **Canvas script**: Vanilla JS Canvas 2D rendering
- **SCSS mixin**: Reusable with Heady design token variables

## Examples

**Input:** "Create a animated Flower of Life loading spinner in purple and gold."

**Output:** 60×60px SVG with 7-circle Seed of Life (loading-appropriate scale), rotating animation at 8s linear, heady-glow stroke color, heady-solar accent.

**Input:** "Make a full-page sacred geometry background for the product detail page."

**Output:** Full-viewport SVG with Flower of Life pattern, radial gradient overlay from void to transparent, subtle rotation animation at 120s, `position: fixed; z-index: -1`.
