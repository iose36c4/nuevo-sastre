# Domain Model Proposal — SASTRE Patternmaking System

> **Status:** Research deliverable (TASK-004, PHASE-10)
> **Date:** 2026-07-25
> **Scope:** Conceptual domain model for a parametric garment patternmaking system. No code.

---

## 1. Core Patternmaking Concepts

### 1.1 Body Measurements

Body measurements are the foundational inputs to any parametric pattern system. They are **user-provided**, **numeric**, and **named**.

| Measurement | Symbol | Definition | Used For |
|---|---|---|---|
| `bust` | B | Circumference at the fullest part of the bust | Bust dart, bodice width, ease |
| `waist` | W | Circumference at the natural waistline | Waist dart, skirt shaping |
| `hip` | H | Circumference at the fullest part of the hips (typically 20cm below waist) | Skirt/pant width |
| `shoulder` | S | Distance from neck point to shoulder point | Shoulder seam length |
| `shoulder_width` | SW | Back width across shoulders | Back bodice width |
| `bust_width` | BW | Half bust circumference (front or back) | Bodice panel width |
| `waist_width` | WW | Half waist circumference | Panel width at waist |
| `hip_width` | HW | Half hip circumference | Panel width at hip |
| `back_waist_length` | BWL | Center back neck to waist | Bodice back length |
| `front_waist_length` | FWL | Shoulder at neck to waist over bust | Bodice front length |
| `arm_length` | AL | Shoulder point to wrist | Sleeve length |
| `upper_arm` | UA | Circumference at widest part of upper arm | Sleeve cap width |
| `wrist` | WR | Circumference at wrist | Cuff width |
| `bust_point` | BP | Distance between bust apex points | Dart placement |
| `bust_height` | BH | Shoulder to bust apex | Dart apex position |
| `neck` | N | Circumference at base of neck | Neckline size |
| `torso_length` | TL | Shoulder to hip vertically | Bodice length at side |
| `crotch_depth` | CD | Waist to crotch (sitting) | Pant rise |
| `inseam` | IS | Crotch to ankle | Pant inseam length |
| `knee` | K | Circumference at knee | Pant leg width |

**Key insight from drafting literature:** Measurements alone are insufficient — they need a **measurement system** (size chart) that maps a size designation to specific values. The NIST Pattern Information Model (APIM) defines `PATTERN_SIZE` as "a garment size designation for a given compilation of anthropometric measurements."

**Design decision:** Measurements are treated as INPUT entities — they are the outermost dependency layer. Every other entity can ultimately depend on measurements.

### 1.2 Ease

Ease is the difference between body measurement and garment measurement. It is critical for fit and must be modeled as an entity, not just a number.

| Type | Definition | Typical Range | Usage |
|---|---|---|---|
| **Wearing ease** | Minimum additional room for movement and comfort | 5–10cm bust, 2–3cm waist | All fitted garments |
| **Design ease** | Additional room for the intended silhouette (loose, oversized) | 0–20cm+ | Style-dependent |
| **Stretch ease** | Negative ease for knits (garment smaller than body) | -2 to -5cm | Knit garments |
| **Fitting ease** | Allowance for adjustment during fitting | 1–2cm | Muslin/toile stage |

**Design decision:** Ease is modeled as a `MeasurementModifier` — it takes a body measurement and produces a garment measurement. The relationship is: `garment_measurement = body_measurement + ease`.

### 1.3 Named Points (Landmark Points)

Named points are geometrically significant positions on the body or pattern that serve as construction anchors. They are defined relative to measurements and other points.

| Point | Definition | Depends On |
|---|---|---|
| `center_front` (CF) | Vertical line at front center of body | waist_width/2, torso_length |
| `center_back` (CB) | Vertical line at back center of body | waist_width/2, torso_length |
| `shoulder_point` (SP) | Junction of shoulder and arm | shoulder, shoulder_width |
| `neck_point` (NP) | Junction of neck and shoulder | neck circumference |
| `bust_apex` (BA) | Bust apex (nipple point) | bust_point, bust_height |
| `waist_notch` (WN) | Point where waistline meets side seam | waist_width, back_waist_length |
| `hip_level` (HL) | Horizontal line at hip circumference | torso_length (typically +20cm) |
| `underarm_point` (UAP) | Bottom of armscye | arm_length, bust |
| `armhole_depth` (AD) | Vertical depth of armhole from shoulder | bust, ease |
| `side_waist` (SW2) | Side seam at waist level | waist_width |
| `shoulder_tip` (ST) | Outer end of shoulder seam | shoulder |
| `dart_apex` (DA) | Point where dart vanishes (typically 1.5–2cm from bust apex) | bust_apex |
| `crotch_point` (CP) | Junction of inseam and crotch curve | crotch_depth, hip |
| `knee_level` (KL) | Horizontal line at knee | inseam, crotch_depth |

**Key insight from drafting literature:** Dart apex is deliberately offset from bust apex by 1.5–2cm to prevent puckering. This offset is a named point derived from bust_apex with a constant displacement.

### 1.4 Lines and Construction References

Lines define the structural framework of a pattern. They can be **construction** (temporary, for drafting) or **structural** (permanent, defining the garment).

| Line | Type | Definition |
|---|---|---|
| `center_front` | Structural/Reference | Vertical fold line or seam at front center |
| `center_back` | Structural/Reference | Vertical fold line or seam at back center |
| `waistline` | Structural | Horizontal line at natural waist |
| `bustline` | Construction | Horizontal line at bust level |
| `hipline` | Structural | Horizontal line at hip level |
| `shoulder_line` | Structural | Line from neck_point to shoulder_point |
| `side_seam` | Structural | Vertical line from underarm to hip |
| `princess_line` | Construction | Curved line from shoulder/armhole through bust apex to waist |
| `grainline` | Reference | Direction of fabric grain (see §1.9) |
| `fold_line` | Reference | Edge placed on fabric fold |
| `seam_line` | Structural | Where two pieces are stitched together |
| `cutting_line` | Structural | Outer edge of piece including seam allowance |
| `hem_line` | Structural | Bottom edge with hem allowance |
| `bust_dart_line` | Construction | Line from dart apex to bust apex (for dart placement) |
| `waist_dart_line` | Construction | Line from dart apex through waist |
| `armhole_depth_line` | Construction | Horizontal line marking armhole depth |
| `chest_line` | Construction | Horizontal line at chest level |

**Design decision:** Construction lines are **ephemeral** — they exist during the drafting process but may not appear in the final piece. Structural lines become part of the piece boundary. The system must distinguish between these two categories.

### 1.5 Curves

Curves are the geometric primitives that define non-straight edges. SASTRE already has Bezier cubics and paths.

| Curve | Context | Characteristic |
|---|---|---|
| `neckline` | Front/back neckline | Smooth curve, typically shallow arc |
| `armhole` | Armscye curve | Complex S-curve from shoulder to underarm |
| `princess_seam` | Front/back princess line | Curved line through bust apex |
| `crotch_curve` | Pant front/back rise | Tight curve, variable by style |
| `sleeve_cap` | Sleeve head | Bell-shaped curve, must ease into armhole |
| `side_curve` | Contoured side seam | Gentle curve for body shaping |
| `collar_curve` | Collar stand/fall | Curved for neck roll |
| `hem_curve` | Shaped hem | Variable, style-dependent |

**Key insight:** Armhole depth is one of the most critical derived measurements: `armhole_depth = bust / 6 + 7cm` (standard formula) or computed from actual measurements. The armhole curve must have the correct length to match the sleeve cap, creating a **cross-entity dependency**.

### 1.6 Contours (Piece Boundaries)

A contour is a closed path that defines the boundary of a pattern piece. This is a first-class entity distinct from a raw `Path` because it carries semantic meaning.

| Contour Type | Definition |
|---|---|
| **Outer boundary (seam line)** | The stitching line — where two pieces join |
| **Cutting line** | The outer edge including seam allowance |
| **Inner boundary** | Holes within a piece (buttonholes, pocket openings) |
| **Fold line** | An edge that lies on fabric fold (no seam allowance) |

**Design decision:** The `Contour` entity wraps a `Path` with additional semantics:
- `closed: true` (always, for piece boundaries)
- `type: 'seam_line' | 'cutting_line' | 'fold_line'`
- `direction: 'clockwise' | 'counterclockwise'` (for offset direction)

### 1.7 Pieces

A Pattern Piece is the primary output entity — it represents a single fabric panel to be cut and sewn.

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Piece identifier (e.g., "Front Bodice") |
| `contour` | Contour | Outer boundary (seam line) |
| `cutting_contour` | Contour | Outer boundary with seam allowance (derived) |
| `internal_paths` | Contour[] | Fold lines, placement lines, decorative stitching |
| `construction_lines` | Line[] | Drafting aids (may or may not render) |
| `grainline` | Grainline | Fabric grain direction |
| `notches` | Notch[] | Match points for sewing |
| `darts` | Dart[] | Shaping folds |
| `seam_allowance_width` | number | Default SA width (mm) |
| `seam_allowance_overrides` | Map<edge, number> | Per-edge SA widths |
| `mirror` | boolean | Whether to mirror (cut on fold) |
| `mirror_axis` | 'center_front' \| 'center_back' \| custom | Mirror reference |
| `label` | PieceLabel | Name, size, grain info, pattern number |
| `quantity` | number | How many to cut |
| `fabric` | string | Fabric identifier |
| `on_fold` | boolean | Whether placed on fold |

**Valentina/Seamly2D reference:** `VPiece` contains:
- `VPiecePath m_path` — the main contour (ordered list of `VPieceNode`s)
- `QVector<VPiecePath> m_internalPaths` — internal cutouts
- `VGrainlineData m_glGrainline` — grainline geometry
- `VPieceLabelData m_ppData` — piece label position/text
- `VPatternLabelData m_piPatternInfo` — pattern info box
- `QVector<CustomSARecord> m_customSARecords` — per-edge seam allowances
- `bool m_inLayout` — whether to include in marker layout

### 1.8 Seam Allowances

Seam allowance is the offset distance between the seam line (stitching line) and the cutting edge. It is a **transformation** applied to a piece contour, not a separate geometric entity.

| Property | Description |
|---|---|
| `width` | Distance in mm (typically 6–15mm, varies by edge) |
| `type` | Standard, French, flat-fell, etc. (affects width) |
| `per_edge` | Different widths for different edges of the same piece |

**Standard widths (from industry research):**

| Width | Context |
|---|---|
| 6mm (¼″) | Quilting, tight curves, necklines, cuffs |
| 10mm (⅜″) | Lightweight garments, armholes, French seams |
| 13mm (½″) | Knit garments, shoulder seams, side seams |
| 15mm (⅝″) | US commercial standard (McCall's, Simplicity, Butterick) |
| 20mm (¾″) | European patterns, couture, straight seams |
| 25–50mm | Hems (varies by garment type) |

**Design decision:** Seam allowance is modeled as:
1. A **global default** on the Piece (e.g., `seamAllowanceWidth: 15`)
2. **Per-edge overrides** via a map (e.g., neckline=10, hem=25)
3. The `addSeamAllowance()` operation produces a new `Contour` (cutting line) from the seam line contour — this is the existing `SeamAllowance.ts` approach

**DXF/AAMA mapping:** Layer 1 = piece boundary (without SA); SA is implicit in the CUT layer polyline.

### 1.9 Notches

Notches are match points that indicate where two pieces should align during sewing. They are placed **on** the seam line and extend perpendicular to it.

| Property | Description |
|---|---|
| `position` | Point on the seam line (by parametric position or explicit point) |
| `depth` | How far the notch extends inward (typically 3–6mm) |
| `angle` | Angle relative to the seam line (typically 90°) |
| `type` | V-notch, slit, T-notch, castle notch, U-notch, check notch |
| `count` | Number of notches at this position (1=standard, 2=match point, 3=center) |
| `side` | Which side of the seam line the notch extends to |

**ASTM D6673 notch types:**
- Layer 4: V-notch and slit-notch (basic alignment)
- Layer 80: T-notch
- Layer 81: Castle notch (U-shape)
- Layer 82: Check notch (V-pointed, perpendicular)
- Layer 83: U-notch

**Valentina approach:** Notches are properties of `VPieceNode` — each node on the piece path can have `isNotch`, `notchType`, `notchSubType`, `notchLength`, `notchWidth`, `notchAngle`, `notchCount`. This means notches are **attached to path vertices**, not separate entities.

**Design decision:** Model notches as entities that reference a position on a contour (by parametric `t` or explicit point), with direction derived from the contour tangent at that point. This decouples notch placement from specific path vertices.

### 1.10 Grainlines

The grainline indicates how the pattern piece should be oriented on the fabric relative to the selvage (lengthwise grain).

| Type | Description |
|---|---|
| **Straight grain** | Parallel to selvage (lengthwise) — most common |
| **Cross grain** | Perpendicular to selvage |
| **Bias grain** | 45° to selvage — for bias-cut drape |
| **Variable** | Custom angle — for specific design effects |

**Properties:**
- `start: Point` — beginning of grainline arrow
- `end: Point` — end of grainline arrow
- `direction: Vector` — computed from start/end
- `parallel_to_edge: boolean | edge_index` — whether aligned to a specific piece edge

**DXF/AAMA mapping:** Layer 7 = grain line (single line entity).

**Valentina approach:** `VGrainlineData` stores start/end points plus angle, length, and arrow geometry.

### 1.11 Darts

Darts are triangular folds that shape flat fabric to fit a curved body. They are the primary mechanism for converting 2D fabric to 3D form.

| Dart Type | Properties | Context |
|---|---|---|
| **Single-pointed** | apex, leg1, leg2, intake (width at seam) | Extends from a seam edge inward |
| **Double-pointed** | apex1, apex2, legs (4 points total) | Internal, for waist shaping |
| **French dart** | apex at bust, angled from side seam | Side bust dart |
| **Shoulder dart** | apex at bust, from shoulder seam | Shoulder bust dart |

**Properties:**
- `apex: Point` — vanishing point (offset 1.5–2cm from bust apex for bust darts)
- `legs: [Point, Point]` — where dart meets the seam line
- `intake: number` — distance between legs (width of dart at seam)
- `fold_line: Segment` — from apex to midpoint of legs (axis of symmetry)
- `angle: number` — opening angle of the dart
- `type: 'single_pointed' | 'double_pointed'`

**Key insight from PerfectDart research:** Dart intake is directly related to the difference between bust and waist measurements. The dart "eats" the excess fabric at the waist. `dart_intake = (bust_circumference - waist_circumference) / number_of_darts`.

**Design decision:** Darts modify the piece contour by:
1. Adding a triangular cutout to the seam line
2. The dart legs become part of the contour
3. When sewn, the dart folds along the fold_line, removing the intake from the flat pattern

### 1.12 Gathers and Pleats

| Type | Description |
|---|---|
| **Gather** | Evenly distributed fullness along a seam, creating soft ripples |
| **Knife pleat** | Folded fabric in one direction |
| **Box pleat** | Two folds meeting at center, facing opposite directions |
| **Inverted pleat** | Box pleat folded inward |
| **Release pleat** | Pleat that opens with movement |

**Properties:**
- `position: Segment` — edge where gathering/pleating occurs
- `fullness: number` — ratio of original length to gathered length (e.g., 1.5 = 50% more fabric)
- `type: 'gather' | 'knife_pleat' | 'box_pleat' | 'inverted_pleat'`
- `count: number` — number of pleats (for pleats)
- `direction: 'left' | 'right' | 'center'` — fold direction (for pleats)

**Design decision:** Gathers and pleats are **length multipliers** on seam edges. They don't modify geometry directly — they inform the user that a longer piece must be gathered to match a shorter piece. The system must track which edges are gathered and their fullness ratio.

### 1.13 Labels and Annotations

| Label Type | Description |
|---|---|
| **Piece label** | Piece name, size, grain direction indicator |
| **Pattern info** | Pattern name, company, date, size range |
| **Construction notes** | Fold here, match to piece X, etc. |
| **Seam type** | French seam, flat-felled, etc. |

---

## 2. Entity Relationships

### 2.1 Containment Hierarchy

```
Pattern (garment)
  └── Piece[] (one or more fabric panels)
        ├── Contour (outer boundary = seam line)
        │     └── Segment[] (ordered, forming closed loop)
        │           ├── Line segments
        │           ├── Bezier segments
        │           └── Arc segments
        ├── Cutting Contour (derived from Contour + SeamAllowance)
        ├── Internal Path[] (fold lines, pocket placements)
        │     └── Segment[]
        ├── Construction Line[] (drafting aids)
        ├── Grainline (reference direction)
        ├── Notch[] (match points on Contour)
        ├── Dart[] (shaping folds)
        │     ├── apex: Point
        │     ├── legs: [Point, Point]
        │     └── fold_line: Segment
        ├── Seam Allowance[] (per-edge overrides)
        │     ├── edge_reference: Segment index
        │     └── width: number (mm)
        ├── Gather/Pleat[] (fullness markers on edges)
        │     ├── edge_reference: Segment index
        │     └── fullness: number
        ├── Piece Label (text + position)
        └── Pattern Info (text + position)
```

### 2.2 Reference Relationships

```
Notch → references → Contour (position on seam line)
Dart → references → Contour (legs are on seam line)
Grainline → references → Piece (or specific edge)
Seam Allowance → references → Contour edges
Gather → references → Contour edge
Construction Line → references → Named Points
Named Point → depends on → Measurements + other Named Points
Contour edge → may be "sewn to" → another Piece's Contour edge
```

### 2.3 Sewing Relationships (Piece-to-Piece)

The most important inter-entity relationship is **seaming** — which edges of which pieces are sewn together.

```
Seam {
  edge_a: { piece_id, edge_index, start_notch, end_notch }
  edge_b: { piece_id, edge_index, start_notch, end_notch }
  type: 'plain' | 'flat_felled' | 'french' | ...
  ease_distribution: 'even' | 'concentrated' | custom
}
```

**Key insight:** Seam matching requires that the seamed edges have equal length (after accounting for ease). This creates a **cross-piece constraint** that the system must validate.

---

## 3. Parametric Dependencies

### 3.1 Measurement Dependencies

```
bust_width     ← bust / 2
waist_width    ← waist / 2
hip_width      ← hip / 2

armhole_depth  ← bust / 6 + 7cm (standard formula, or custom)
                ← also depends on: ease, armhole_shape

neck_width     ← neck / 5 + 1cm (standard formula)
neck_depth     ← neck / 5 + 0.5cm (standard formula)

shoulder_slope ← f(shoulder_width, bust) (angle, typically 15–22°)

bust_dart_intake ← (bust - waist) / 2 / number_of_darts
waist_dart_intake ← (bust - waist) / number_of_waist_darts

back_waist_length ← (provided or computed from height)
front_waist_length ← back_waist_length + bust_dart_intake
```

### 3.2 Construction Dependencies

```
center_front_line  ← waist_width/2, torso_length
center_back_line   ← waist_width/2, torso_length
waistline          ← back_waist_length (from neck)
hipline            ← waistline + 20cm (standard)
bustline           ← waistline - bust_height

shoulder_point     ← neck_point + shoulder_direction × shoulder_length
neck_point         ← center_front + neck_width (front)
                    ← center_back + neck_width/2 (back, half of front neck)

bust_apex          ← center_front + bust_point/2 (horizontal)
                    ← waistline - bust_height (vertical)

dart_apex          ← bust_apex + offset (1.5–2cm toward center)

armhole_curve      ← shoulder_point, underarm_point, + control points
                    ← must have correct length for sleeve cap matching

sleeve_cap         ← armhole_length (must match + ease)
                    ← armhole_depth, upper_arm
```

### 3.3 Cross-Piece Dependencies

```
front_bodice_contour ←→ back_bodice_contour
  (shoulder seams must match in length)
  (side seams must match in length)

sleeve_cap_length ←→ armhole_length + ease (typically 2–3cm ease)

front_skirt ←→ back_skirt
  (waist seams must match after darts)
  (hip seams must match)
  (hem lengths should match)
```

### 3.4 Dependency Graph Structure

The dependency graph is a **DAG** (Directed Acyclic Graph). The existing `model/DAG.ts` in SASTRE already provides topological sort. The pattern domain extends this with:

```
Layer 0: Body Measurements (inputs, no dependencies)
Layer 1: Ease values (depend on measurements)
Layer 2: Derived measurements (depend on measurements + ease)
Layer 3: Named points (depend on measurements + derived measurements)
Layer 4: Construction lines (depend on named points)
Layer 5: Contours / Piece boundaries (depend on construction lines, curves)
Layer 6: Darts (depend on contours + measurements)
Layer 7: Notches (depend on contours)
Layer 8: Seam allowances (depend on contours)
Layer 9: Pieces (depend on all above)
```

---

## 4. Entity Classification

### 4.1 Input Entities (User-Provided)

| Entity | Source | Example |
|---|---|---|
| Body measurements | User / size chart | `bust: 96`, `waist: 72` |
| Ease values | User / defaults | `wearing_ease: 8` |
| Design choices | User | `style: "fitted"`, `dart_type: "princess"` |
| Fabric properties | User | `stretch: 0.15`, `type: "knit"` |

### 4.2 Construction Entities (Intermediate Geometry)

| Entity | Depends On | Purpose |
|---|---|---|
| Derived measurements | Measurements + ease | `bust_width`, `armhole_depth` |
| Named points | Measurements | `shoulder_point`, `bust_apex` |
| Construction lines | Named points | `center_front`, `waistline` |
| Dart lines | Named points + measurements | `bust_dart_line` |
| Template curves | Named points | `neckline_template`, `armhole_template` |
| Intermediate contours | Construction lines + curves | Half-bodice before mirroring |

### 4.3 Output Entities (Final Pieces)

| Entity | Depends On | Description |
|---|---|---|
| Pattern Piece | Everything above | Complete, cut-ready piece |
| Cutting contour | Piece contour + seam allowance | Outer edge for cutting |
| Notch marks | Piece contour | Visual alignment marks |
| Grainline | Piece orientation | Fabric direction |
| Labels | Piece metadata | Identification |
| Seam specification | Two pieces' edges | Sewing instructions |

---

## 5. Existing Codebase Assessment

### 5.1 Current Pattern Entities (from kanban.json, all "done")

The existing system defines these in `src/pattern/` (planned, not yet present as source files):

| Entity | Current Definition | Domain Model Fit | Gap |
|---|---|---|---|
| **Piece** | `{name, contour: Path, constructionLines, grainline?, notches, labels, seamAllowanceWidth}` | Partial — covers basics | Missing: cutting_contour, darts, internal_paths, mirror, on_fold, quantity, fabric, per_edge SA, sewing relationships |
| **SeamAllowance** | `addSeamAllowance(piece, width) -> new Piece` | Function, not entity | Missing: per-edge overrides, SA type (French, flat-fell), hem allowance distinction |
| **Notch** | `{position, depth, angle}` | Minimal | Missing: type (V, T, U, slit, castle), count, side, direction, matching relationship |
| **Grainline** | `{directed segment with arrow}` | Minimal | Missing: parallel_to_edge reference, bias/cross grain types |
| **Dart** | `{apex, leg1, leg2}` with rotation | Minimal | Missing: type (single/double-pointed), intake, fold_line, dart offset from apex, sewing relationship |

### 5.2 Assessment Summary

The current definitions are **sufficient for the boxer shorts pattern** (the current target) but **insufficient for a general patternmaking system**. The gaps are:

1. **No measurement entity** — the system has no concept of body measurements or how they relate to geometry
2. **No ease concept** — no distinction between body measurement and garment measurement
3. **No named points / construction references** — geometry is anonymous, not semantically named
4. **No sewing relationships** — no way to specify "this edge is sewn to that edge"
5. **No gather/pleat model** — no concept of fullness
6. **No dart types** — only triangular dart, no double-pointed, no French dart
7. **No per-edge seam allowance** — single global width only
8. **No piece-to-piece constraints** — no validation that seamed edges match in length
9. **No cutting contour derivation** — SeamAllowance returns a new Piece, but there's no explicit separation of seam_line vs. cutting_line

### 5.3 Recommendations for Domain Model Integration

The existing geometry engine (`geometry/`) and DSL (`dsl/`) are **solid foundations**. The domain model should be built as a **semantic layer on top**:

```
geometry/ (Point, Segment, Path, Bezier, ...) — DONE
model/ (Entity, Registry, DAG)                — DONE
dsl/ (Lexer, Parser, AST, Interpreter)        — DONE (v0.1–v0.3)
svg/ (Renderer, Export)                       — DONE
pattern/                                      — NEEDS DOMAIN MODEL
  ├── Measurement.ts        — NEW: body measurements + ease
  ├── NamedPoint.ts          — NEW: semantic construction points
  ├── ConstructionLine.ts    — NEW: drafting references
  ├── Piece.ts               — ENHANCE: add missing fields
  ├── SeamAllowance.ts       — ENHANCE: per-edge, type-aware
  ├── Notch.ts               — ENHANCE: types, matching
  ├── Grainline.ts           — ENHANCE: types, edge reference
  ├── Dart.ts                — ENHANCE: types, intake, sewing
  ├── Gather.ts              — NEW: fullness markers
  ├── Pleat.ts               — NEW: pleat specifications
  ├── Seam.ts                — NEW: piece-to-piece sewing
  ├── Contour.ts             — NEW: semantic boundary wrapper
  └── PieceLabel.ts          — NEW: label positioning/text
```

---

## 6. Existing Patternmaking Domain Models (Research Summary)

### 6.1 Valentina/Seamly2D

The most comprehensive open-source patternmaking system. Key architectural insights:

**Document structure:**
- XML-based (`.val` files)
- Three modes: Calculation → Modeling → Details (seam allowances)
- Custom variables (formulas) computed from measurement tables
- Draft blocks (pattern pieces) with ordered tool history

**Piece model (`VPiece`):**
- Main path: `VPiecePath` = ordered list of `VPieceNode`s
- Each node references a construction tool by ID (point, arc, spline, etc.)
- Nodes carry: SA width before/after, angle type, notch properties
- Internal paths (for pockets, darts, etc.)
- Custom SA records (per-edge seam allowances)
- Grainline geometry (start/end points + angle)
- Pattern/piece labels with positioning

**Key design pattern:** Valentina separates **calculation** (construction geometry, invisible in final) from **modeling** (piece boundary, visible). This maps directly to our construction entities vs. output entities distinction.

**Node system:** `VPieceNode` is a rich entity:
- References a geometric object by tool ID
- Carries notch properties (type, subtype, length, width, angle, count)
- Carries SA properties (before/after width formulas)
- Has angle type (for corner treatment during SA offset)
- Can be excluded from the main path
- Can be reversed (for curve direction)

### 6.2 ASTM D6673 / AAMA DXF Format

The industry standard for pattern exchange. Key entities:

**Layer system (23 layers):**
- Layer 1: Piece boundary (closed polyline, no SA)
- Layer 2: Turn points (corner vertices)
- Layer 3: Curve points (bezier/spline control)
- Layer 4: Notches (V-notch, slit-notch)
- Layer 5: Grade reference line
- Layer 6: Mirror line (fold)
- Layer 7: Grain line
- Layer 8: Internal lines (placement, not cut)
- Layer 11: Internal cutouts
- Layer 13: Drill holes
- Layer 14: Sew lines
- Layer 80–83: Notch variants (T, castle, check, U)
- Layers 84–87: Quality validation curves

**Block system:** Each piece is a DXF block containing:
- Piece system text (name, size, quantity, flip, tilt, fold, material)
- Boundary polyline (layer 1)
- All other entities on their respective layers

**Design insight:** ASTM treats the pattern as **production-ready geometry** — it's a flat, non-parametric representation. Our system must produce this as an **output format**, while maintaining the parametric model internally.

### 6.3 NIST Pattern Information Model (APIM / STEP)

The most formally rigorous model, using EXPRESS notation:

**Entity hierarchy:**
```
READY_TO_WEAR_PATTERN
  ├── unit: measurement_unit
  ├── base_size: PATTERN_SIZE
  ├── base_pattern: PATTERN
  │     ├── style_name: STRING
  │     ├── description: STRING
  │     ├── tolerance: OPTIONAL REAL
  │     └── pieces: PATTERN_PIECE[]
  │           ├── piece_name: STRING
  │           ├── quantity: INTEGER
  │           └── basic_piece: BASIC_PATTERN_PIECE
  │                 ├── boundary: COMPOSITE_CURVE_FEATURE (boundary_cut)
  │                 ├── internal_lines: COMPOSITE_CURVE_FEATURE[] (fold_line, sew_line)
  │                 ├── notch_features: NOTCH_FEATURE[]
  │                 │     ├── slit_notch | v_notch
  │                 │     └── point, direction, depth
  │                 ├── mark_features: MARK_FEATURE[] (drill holes)
  │                 ├── orientation_constraints: ORIENTATION_CONSTRAINT
  │                 └── annotation_features: ANNOTATION_FEATURE[]
  └── grade_rules: GRADE_RULES_OF_PATTERN
        ├── pattern_sizes: PATTERN_SIZE[]
        └── rules: GRADE_RULES_OF_PIECE[]
              └── grade_data_at_point[]
                    ├── point: GRADE_POINT
                    └── grade_deltas: GRADE_DELTA[]
```

**Key entity types:**
- `COMPOSITE_CURVE_FEATURE`: Curve with semantic type (boundary_cut, internal_cut_out, fold_line, sew_line)
- `NOTCH_FEATURE`: Slit or V-notch with position, direction, depth
- `MARK_FEATURE`: Drill hole, lift point, stacking point
- `GRADE_POINT`: Point subject to grading (size scaling)
- `ORIENTATION_CONSTRAINT`: Mirror/fold information

**Design insight:** The EXPRESS model separates **geometry** (points, lines, arcs, polylines) from **semantics** (what each geometry means). This confirms our approach of semantic entities wrapping geometric primitives.

### 6.4 Computational Patternmaking Research

Recent academic work (Pietroni et al. 2022, de Malefette et al. 2023) reveals:

**Dart optimization:** Darts can be computationally optimized using energy minimization (closeness, stretchability, smoothness). The dart configuration is parameterized by position, intake width, and length.

**Seam symmetry:** Matching seams must be reflection-symmetric for flat sewing. This is a geometric constraint the system should enforce.

**Grain alignment:** Pattern pieces should be oriented so fabric grain aligns with gravity direction when worn. This is a rotation constraint on piece placement.

**Fabric strain:** Flattening a 3D shape to 2D introduces distortion. Woven fabric has anisotropic behavior (different stretch on-grain vs. cross-grain). The system should track which pieces are under stress.

---

## 7. Design Rationale and Decisions

### 7.1 Why Measurements Are Entities, Not Just Numbers

Measurements drive the entire parametric chain. Making them entities allows:
- Validation (bust > waist, all positive)
- Unit awareness (cm vs. inches)
- Size chart composition (standard + custom)
- Grading (size-dependent scaling)
- Reuse across patterns

### 7.2 Why Named Points Are Necessary

Anonymous geometry (`point at (45, 120)`) is not maintainable. Named points (`bust_apex at (45, 120)`) enable:
- Self-documenting patterns
- Dependence tracking (if bust changes, bust_apex moves)
- Cross-referencing (dart apex references bust_apex)
- Error reporting ("bust_apex is outside piece boundary")

### 7.3 Why Seam Allowance Is a Transformation, Not a Property

Seam allowance changes the geometry (offsets the contour). Modeling it as:
1. A property of the Piece (default width)
2. A transformation function (`addSeamAllowance()`)
3. Producing a derived `cutting_contour`

This preserves the parametric relationship: if the seam line changes, the cutting line updates automatically.

### 7.4 Why Sewing Relationships Are Entities

Without sewing relationships, the system cannot:
- Validate that seamed edges have equal length
- Generate sewing instructions
- Check that notches match across pieces
- Compute ease distribution along seams

### 7.5 Coordinate System and Units

- **Internal:** Y-up Cartesian, origin per-pattern
- **Units:** Millimeters (IEEE-754 binary64)
- **SVG output:** Y-down, 1 user unit = 1mm
- **Epsilon:** 0.001mm (geometric), 0.01mm (intersection)

---

## 8. Recommendations for Implementation Order

Based on the dependency graph and the existing codebase:

### Phase A: Measurement Foundation
1. `Measurement` entity (name, value, unit)
2. `Ease` entity (type, value)
3. `DerivedMeasurement` (formula, dependencies)
4. `MeasurementSet` (size chart / input collection)

### Phase B: Named Point System
5. `NamedPoint` entity (name, position, dependencies)
6. Extend `model/Registry` to support named points
7. `ConstructionLine` entity (name, type, endpoints)

### Phase C: Contour and Piece Enhancement
8. `Contour` entity (wrapping Path with semantics)
9. Enhance `Piece` with missing fields (darts, internal_paths, mirror, etc.)
10. `PieceLabel` entity

### Phase D: Pattern Operations Enhancement
11. Enhance `Notch` with types and matching
12. Enhance `Dart` with types and sewing
13. `Gather` / `Pleat` entities
14. Enhance `SeamAllowance` with per-edge overrides
15. `Grainline` enhancement

### Phase E: Sewing Model
16. `Seam` entity (piece-to-piece relationship)
17. Cross-piece validation (edge length matching)
18. Notch matching validation

### Phase F: DSL Integration
19. DSL v1.0 commands: PATTERN, PIECE, SEAM_ALLOWANCE, NOTCH, GRAINLINE
20. DSL commands for measurements (INPUT with type annotations)
21. DSL commands for darts, gathers, pleats

---

## 9. Open Questions

1. **Grading:** Should the domain model support multi-size grading (ASTM layer 5), or is single-size sufficient for v1.0?
2. **Fabric properties:** Should stretch percentage be part of the domain model, or handled externally?
3. **3D relationship:** Should the model track which 3D body surface each piece maps to (for virtual try-on)?
4. **Pattern nesting:** Should the model include marker layout / cutting optimization?
5. **Historical patterns:** Should the model support pattern manipulation history (Valentina's tool-based approach)?

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| Block / Sloper | Basic pattern shape without design details, used as a starting point |
| Bodice | Upper body pattern piece (chest to waist) |
| Contour | Closed path defining a piece boundary |
| Dart | Triangular fold for shaping |
| Ease | Difference between body and garment measurement |
| Grainline | Direction of fabric thread alignment |
| Intake | Width of dart at the seam edge |
| Marker | Layout of pieces on fabric for efficient cutting |
| Notch | Match point on seam line |
| Princess line | Seam from shoulder/armhole through bust to waist |
| Seam allowance | Distance between stitch line and cut edge |
| Selvage | Finished edge of woven fabric (parallel to grain) |
| Sloper | See block |
| Underarm | Junction of sleeve and bodice at armhole |

## Appendix B: References

1. ASTM D6673-10: Standard Practice for Sewn Products Pattern Data Interchange—Data Format
2. NIST IR 5969: Data Sharing Implementation Based on the Information Model for Apparel Pattern Making (Lee, 1997)
3. NIST IR 5115: A Prototype Application Protocol for Ready-to-Wear Pattern Making (1993)
4. Valentina/Seamly2D source: github.com/FashionFreedom/Seamly2D
5. Pietroni et al., "Computational Pattern Making from 3D Garment Models," ACM TOG 2022
6. de Malefette et al., "PerfectDart: Automatic Dart Design for Garment Fitting," ACM TOG 2023
7. Patternmaking Made Easy (Margaret, 2016) — seam allowance standards
8. Threads Magazine: Industry Seam Allowances — variable SA by garment area
