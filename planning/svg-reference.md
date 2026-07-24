# SVG Reference for Pattern-Making Tool

Technical reference for building an SVG-based pattern generation system with precise geometry, measurements, and labels.

---

## 1. SVG Structure Best Practices

### viewBox and Coordinate Systems

The `viewBox` is the single most important attribute for a pattern-making tool. It defines the mapping between your internal coordinate system and the rendered output.

```xml
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="210mm" height="297mm"
  viewBox="0 0 210 297"
>
```

**Key rules:**

- `viewBox="min-x min-y width height"` — the four values define your user coordinate system
- The viewport (`width`/`height`) defines the physical output size; the `viewBox` defines internal units
- When `viewBox` aspect ratio matches the viewport, content scales to fill; use `preserveAspectRatio` to control mismatched ratios
- Origin `(0,0)` is top-left; X increases right, Y increases down
- For print-accurate patterns, match `width`/`height` to physical units and set `viewBox` to the same numeric values

**Recommendation for patterns:**

| Pattern Size | viewport width/height | viewBox |
|---|---|---|
| A4 portrait | `210mm 297mm` | `0 0 210 297` |
| A3 portrait | `297mm 420mm` | `0 0 297 420` |
| Custom (cm) | `{w}cm {h}cm` | `0 0 {w} {h}` |

This makes **1 user unit = 1 millimeter**, which is the standard for pattern making. All coordinates in paths, text positions, and dimensions then directly represent millimeters.

### Units: mm vs px

| Approach | Pros | Cons |
|---|---|---|
| `viewBox` with `mm` viewport (`width="210mm"`) | Physical accuracy, 1 unit = 1mm, prints at correct size | Requires `viewBox` for scaling |
| Pixel-based (`width="794" height="1123"` at 96dpi) | Simple integers, web-native | No physical meaning, DPI-dependent |
| No units (bare numbers) | Simplest | Ambiguous, renderer decides |

**Recommendation:** Use `viewBox` with mm-based viewport. Set `viewBox="0 0 {width_mm} {height_mm}"` and `width="{width_mm}mm" height="{height_mm}mm"`. This guarantees 1 SVG user unit = 1mm in any compliant renderer, including print.

### Groups and Layers

Use `<g>` elements to organize pattern pieces, seam allowances, grainlines, labels, and notches:

```xml
<svg viewBox="0 0 210 297" width="210mm" height="297mm">
  <defs>
    <style>
      .cut-line { stroke: #000; stroke-width: 0.5; fill: none; }
      .seam-allowance { stroke: #666; stroke-width: 0.3; fill: none; stroke-dasharray: 2 1; }
      .grainline { stroke: #00f; stroke-width: 0.3; fill: none; marker-end: url(#arrow); }
      .label { font-family: sans-serif; font-size: 2.5px; fill: #000; }
    </style>
  </defs>

  <g id="piece-front-bodice" data-piece="front-bodice">
    <g class="cut-lines">
      <path class="cut-line" d="M 10 20 L 80 20 ..." />
    </g>
    <g class="seam-allowance">
      <path class="seam-allowance" d="M 9.5 19.5 L 80.5 19.5 ..." />
    </g>
    <g class="annotations">
      <line class="grainline" x1="45" y1="25" x2="45" y2="180" />
      <text class="label" x="45" y="170" text-anchor="middle">FRONT BODICE — Cut 1 on fold</text>
      <text class="label" x="45" y="174" text-anchor="middle">Size: M | Grain: ↕</text>
    </g>
  </g>

  <g id="piece-back-bodice" data-piece="back-bodice">
    ...
  </g>
</svg>
```

**Naming conventions:**

- `id` on `<g>`: kebab-case identifier (`piece-front-bodice`, `piece-sleeve`)
- `data-*` attributes for programmatic access: `data-piece`, `data-size`, `data-seam-allowance`
- CSS classes for styling categories: `.cut-line`, `.seam-allowance`, `.fold-line`, `.notch`, `.grainline`, `.label`
- `<defs>` for reusable markers (arrows, notch marks, cross-hairs)

### Style Attributes

**Recommendation:** Use presentation attributes on elements (not inline `style=""` or `<style>`) for the most portable, tool-friendly output:

```xml
<!-- Best for programmatic generation — presentation attributes -->
<path d="..." fill="none" stroke="#000000" stroke-width="0.5" />

<!-- Also good — CSS classes in <style> for bulk styling -->
<style>.cut-line { fill: none; stroke: #000; stroke-width: 0.5; }</style>
<path class="cut-line" d="..." />

<!-- Avoid — inline style is harder to override and less transparent -->
<path style="fill:none;stroke:#000;stroke-width:0.5" d="..." />
```

---

## 2. SVG Path Commands

### Complete Reference for Pattern Geometry

| Command | Syntax | Purpose in Pattern Making |
|---|---|---|
| **M / m** | `M x y` / `m dx dy` | Start a new path section (move to neckline start, armhole, etc.) |
| **L / l** | `L x y` / `l dx dy` | Straight line — darts, straight seams, side seams |
| **H / h** | `H x` / `h dx` | Horizontal line — hemlines, waistline straight segments |
| **V / v** | `V y` / `v dy` | Vertical line — center front/back, grainline arrows |
| **C / c** | `C x1 y1 x2 y2 x y` | Cubic Bézier — armhole curves, princess seams, neckline curves |
| **Q / q** | `Q x1 y1 x y` | Quadratic Bézier — simple curves, dart shaping |
| **T / t** | `T x y` | Smooth quadratic continuation — extended smooth curves |
| **A / a** | `A rx ry rotation large-arc sweep x y` | Elliptical arc — circle arcs, curved hemlines |
| **Z / z** | `Z` | Close path — complete pattern piece outline |

**Absolute vs Relative:** Use absolute (`M`, `L`, `C`) for pattern pieces where you have precise coordinates from measurements. Use relative (`m`, `l`, `c`) when building parametrically from a starting point.

### Practical Examples for Clothing Patterns

**Simple rectangle with notches (bodice block):**
```
M 0 0 H 40 V 60 H 0 Z
```
(40mm wide, 60mm tall rectangle — moves right, down, left, closes)

**Armhole curve (cubic Bézier):**
```
M 0 0        (shoulder point)
C 2 -15      (control point 1 — pulls curve inward at upper arm)
  18 -20     (control point 2 — approaches underarm)
  20 -15     (underarm point)
```

**Neckline with quadratic Bézier:**
```
M 0 0 Q 12 8 25 2    (neckline curve from center front to shoulder)
```

**Curved hemline (arc):**
```
M 0 60 A 50 50 0 0 1 40 60   (gentle curve for hem, half-ellipse arc)
```

**Notch markers as separate paths:**
```xml
<!-- Triangle notch pointing outward at seam -->
<path d="M 20 30 L 18 33 L 22 33 Z" class="notch" />

<!-- T-notch at matching point -->
<path d="M 35 0 V 3 M 34 3 H 36" class="notch" stroke-width="0.3" fill="none" />
```

### Arc Command Detail (A)

The arc command is the most complex but important for pattern curves:

```
A rx ry x-axis-rotation large-arc-flag sweep-flag x y
```

| Parameter | Values | Meaning |
|---|---|---|
| `rx ry` | positive numbers | Ellipse radii (use equal for circular arcs) |
| `x-axis-rotation` | degrees | Rotation of ellipse (usually `0` for patterns) |
| `large-arc-flag` | `0` or `1` | Shorter arc (`0`) vs longer arc (`1`) |
| `sweep-flag` | `0` or `1` | Counter-clockwise (`0`) vs clockwise (`1`) |
| `x y` | coordinates | End point |

**Full circle from two arcs:**
```
M cx-r cy A r r 0 1 0 cx+r cy A r r 0 1 0 cx-r cy
```

### Coordinate Precision

For pattern-making output, **round to 2 decimal places** (0.01mm precision). This is well beyond human cutting accuracy while keeping path data compact:

```
M 10.00 20.00 L 80.50 20.00 C 82.30 18.50 85.00 25.00 83.75 30.25
```

---

## 3. SVG Validation

### Programmatic Validation Options

| Tool | Type | Approach | Use Case |
|---|---|---|---|
| **`svg-inspector`** | npm (TypeScript) | W3C SVG 1.1/2.0 spec validation | Comprehensive structural validation |
| **W3C SVG Validator** | Java/REST API | Official W3C validator | Gold-standard spec compliance |
| **DOMPurify** | npm | HTML/SVG sanitizer | Security: strips `<script>`, event handlers |
| **SVGO** | npm (TypeScript) | Optimizer with built-in parsing | Validates while optimizing |
| **Browser DOMParser** | Native API | Parses XML/SVG | Quick syntax validation in browser/Node |

### Recommended Validation Pipeline

```typescript
import { optimize } from 'svgo';
// For Node.js: use svg-inspector or jsdom
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

function validatePatternSVG(svgString: string): ValidationResult {
  const errors: string[] = [];

  // 1. XML well-formedness
  try {
    const dom = new JSDOM(svgString, { contentType: 'image/svg+xml' });
    const doc = dom.window.document;
    const svgEl = doc.querySelector('svg');
    if (!svgEl) errors.push('No <svg> root element found');
  } catch (e) {
    errors.push(`XML parse error: ${e.message}`);
    return { isValid: false, errors };
  }

  // 2. Required attributes
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    errors.push('Missing xmlns attribute');
  }
  if (!svgString.includes('viewBox=')) {
    errors.push('Missing viewBox attribute');
  }

  // 3. Security sanitization
  const sanitized = DOMPurify.sanitize(svgString, {
    USE_PROFILES: { svg: true, svgFilters: false },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror'],
  });

  // 4. Optimize (also validates path data)
  try {
    const result = optimize(svgString, {
      multipass: false,
      plugins: [
        { name: 'preset-default', params: { overrides: { removeViewBox: false } } }
      ],
    });
  } catch (e) {
    errors.push(`SVGO error: ${e.message}`);
  }

  return { isValid: errors.length === 0, errors };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

### Key Validation Checks for Pattern SVGs

1. **XML well-formedness** — required `xmlns`, proper closing tags
2. **viewBox present and valid** — format: four numbers
3. **Path data syntax** — valid `d` attribute commands and coordinates
4. **No forbidden elements** — `<script>`, `<foreignObject>`
5. **Units consistency** — all coordinates within viewBox bounds
6. **Element hierarchy** — `<defs>`, `<g>`, `<path>`, `<text>` properly nested

---

## 4. SVG Libraries for TypeScript/JavaScript

### Recommended Stack for Pattern Generation

| Library | Version | Purpose | Why It Fits |
|---|---|---|---|
| **SVGO** | 4.x | SVG optimization & validation | Industry standard (22K+ stars), TypeScript native, full `optimize()` API, removes bloat while preserving `viewBox` |
| **svg-path-commander** | 2.2.x | Path manipulation & transforms | TypeScript native, `getBBox()`, `getTotalLength()`, path transforms via DOMMatrix, works in Node.js |
| **`@svgdotjs/svg.js`** | 3.2 | SVG DOM construction | Lightweight (zero deps), fluent API for building SVG documents programmatically, good for browser-side rendering |
| **DOMPurify** | 3.x | SVG sanitization | Security layer if SVGs come from user input or external sources |

### Library Details

#### SVGO (Post-Generation Optimization)

```typescript
import { optimize } from 'svgo';

// Post-process generated SVG for clean output
const result = optimize(rawSVG, {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,          // CRITICAL: keep viewBox
          convertPathData: {
            floatPrecision: 2,           // 2 decimal places = 0.01mm
            transformPrecision: 3,
          },
          mergePaths: { force: true },
        },
      },
    },
    'removeDimensions',                  // Remove width/height if viewBox present
    'sortAttrs',
    { name: 'removeAttrs', params: { attrs: ['data-name', 'xml:space'] } },
  ],
});

const cleanSVG = result.data;
```

**Key SVGO config for patterns:**
- Always set `removeViewBox: false`
- Set `floatPrecision: 2` (sufficient for 0.01mm precision)
- Keep `multipass: true` for maximum cleanup
- Use `removeDimensions` only when viewBox is sufficient

#### svg-path-commander (Path Math)

```typescript
import SVGPathCommander from 'svg-path-commander';

// Get bounding box of a pattern piece path
const path = new SVGPathCommander('M 10 20 C 12 18 18 25 20 30 L 20 60 H 0 Z');
const bbox = path.getBBox();
// { x: 10, y: 18, width: 10, height: 42 }

// Transform (rotate pattern piece 90° around its center)
const rotated = path.transform({
  rotate: [90, bbox.x + bbox.width/2, bbox.y + bbox.height/2],
});

// Get total length (perimeter of pattern piece)
const length = path.getTotalLength();

// Optimize path data
const optimized = path.optimize(2); // 2 decimal precision
```

#### SVG.js (Document Construction)

```typescript
import { SVG } from '@svgdotjs/svg.js';

// Build a pattern SVG document programmatically
const draw = SVG().viewbox(0, 0, 210, 297);

// Add a pattern piece
const piece = draw.group().id('piece-front');
const outline = piece.path('M 10 20 L 80 20 C 82 18 85 25 83.75 30.25 L 83.75 80 H 10 Z');
outline.fill('none').stroke({ color: '#000', width: 0.5 });

// Add grainline
piece.line(45, 25, 45, 170)
  .stroke({ color: '#0000ff', width: 0.3, dasharray: '4 2' });

// Add label
piece.text('FRONT BODICE')
  .move(30, 170)
  .font({ size: 2.5, family: 'sans-serif' });

// Export
const svgString = draw.svg();
```

### Decision Matrix: When to Use What

| Task | Use |
|---|---|
| Build SVG string from scratch | Template literals (recommended) or SVG.js |
| Build SVG in browser with interactive preview | SVG.js |
| Optimize output for file size / cleanliness | SVGO |
| Compute bounding boxes, path lengths, transforms | svg-path-commander |
| Validate against W3C spec | svg-inspector or DOMParser |
| Sanitize user-contributed SVGs | DOMPurify |
| Convert shapes to paths | svg-path-commander `.shapeToPath()` |

### Recommendation: Template Literals Over Heavy Libraries

For a pattern-making tool that produces static SVG files, **template literals are the most practical approach**:

```typescript
function generatePatternPiece(piece: PatternPiece): string {
  const { name, cutLine, seamAllowance, grainline, labels } = piece;

  return `
    <g id="piece-${slugify(name)}" data-piece="${slugify(name)}">
      <g class="seam-allowance">
        <path class="seam-allowance" d="${seamAllowance}" />
      </g>
      <g class="cut-lines">
        <path class="cut-line" d="${cutLine}" />
      </g>
      <g class="annotations">
        <line class="grainline"
          x1="${grainline.x1}" y1="${grainline.y1}"
          x2="${grainline.x2}" y2="${grainline.y2}" />
        ${labels.map(l => `<text class="label" x="${l.x}" y="${l.y}" text-anchor="middle">${l.text}</text>`).join('\n        ')}
      </g>
    </g>`;
}

function generatePatternSheet(pieces: PatternPiece[], size: { w: number; h: number }): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${size.w} ${size.h}"
     width="${size.w}mm" height="${size.h}mm">
  <defs>
    <style>${PATTERN_STYLES}</style>
    <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5"
            markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0000ff"/>
    </marker>
  </defs>
  <g id="pattern-sheet">
    ${pieces.map(p => generatePatternPiece(p)).join('\n    ')}
  </g>
</svg>`;
}
```

This approach:
- Zero dependencies for generation
- Full control over output format
- Easy to debug (output is readable SVG)
- Pass through SVGO only for final optimization
- Use svg-path-commander only when you need path math

### npm Packages to Install

```bash
npm install svgo                    # Post-generation optimization
npm install svg-path-commander      # Path math, transforms, bounding boxes
npm install jsdom                   # Server-side DOM parsing for validation
npm install dompurify              # Security sanitization (optional)
```

---

## Summary of Recommendations

| Area | Recommendation |
|---|---|
| **Coordinate system** | `viewBox="0 0 {w_mm} {h_mm}"` with `width="{w}mm" height="{h}mm"` — 1 unit = 1mm |
| **Style** | CSS classes in `<defs><style>` for bulk styling, presentation attributes for per-element |
| **Layers** | `<g>` groups per piece, nested: seam allowance > cut line > annotations |
| **Path commands** | `M/L/C/Z` for piece outlines, `C` for curves, `A` for arcs, `H/V` for straight segments |
| **Precision** | 2 decimal places (0.01mm), round all coordinates |
| **Validation** | DOMParser + xmlns check + viewBox check + SVGO parse test |
| **SVG generation** | Template literals (primary) + SVGO (optimization) + svg-path-commander (path math) |
| **Naming** | kebab-case IDs, `data-piece`/`data-size` attributes, semantic CSS classes |
