# ViewStyle 2D Cell Layout Design

## Goal

Implement every supported `ViewStyle` property as a terminal-cell layout system while leaving `TextStyle` and the Text component's styling behavior unchanged.

The renderer will behave similarly to browser layout where that model maps cleanly to a terminal: Views use content-based automatic sizing, explicit dimensions use a content box, normal-flow children determine automatic size, flex layout controls the main and cross axes, and positioned children are composited over the resulting cell grid.

## Public Style Contract

`ViewStyle` keeps the following groups:

- size: `width`, `height`
- positioning: `position`, `top`, `right`, `bottom`, `left`, `zIndex`
- layout: `display`, `flexDirection`, `justifyContent`, `alignItems`
- paint: `backgroundColor`, `backgroundGradient`
- spacing: margin and padding shorthand/axis/side properties
- border: `borderStyle`, `borderWidth`, `borderColor`

`alignItems` will accept CSS-compatible values only:

- `stretch`
- `center`
- `flex-start`
- `flex-end`

The existing invalid `space-between` and `space-evenly` values will be removed from `alignItems`. They remain valid for `justifyContent`.

`backgroundGradient.rotation` is expressed in degrees and follows CSS linear-gradient angle semantics:

- `0`: bottom to top
- `90`: left to right
- `180`: top to bottom
- `270`: right to left

Angles outside the `0` through `359` range are normalized modulo 360. Gradient colors override `backgroundColor` when both are present.

All numeric layout values are terminal-cell counts. Finite values are floored to integers. Negative width, height, padding, border-related size, and margin values resolve to zero. Position offsets may be negative.

## Internal Representation

String concatenation is insufficient for horizontal flex layout, overlap, or z-index. The layout stage will therefore use a two-dimensional terminal cell model.

```ts
type Cell = {
    character: string;
    foreground?: ResolvedColor;
    background?: ResolvedColor;
};

type LayoutBox = {
    width: number;
    height: number;
    cells: Cell[][];
};
```

A blank cell contains a single space. Layout is performed without ANSI sequences. ANSI control sequences are emitted only when the final root `LayoutBox` is serialized.

This makes cell dimensions independent of color escape sequences and ensures blank padding, borders, and backgrounds occupy real terminal space.

## Rendering Pipeline

The React reconciler continues to own and mutate the existing host tree. After a commit, terminal rendering becomes a separate recursive layout pass:

1. Convert raw text instances and existing Text host output into unstyled content boxes.
2. Recursively lay out nested View children.
3. Resolve each View's box model and normal-flow layout.
4. Place relative and absolute children.
5. Paint background, borders, and children into a cell grid in z-index order.
6. Serialize the root grid to a newline-separated ANSI string.
7. Pass the result to the existing terminal redraw logic.

The Text component renderer and `TextStyle` are not modified. Text content participates in View layout as plain terminal cells. Explicit newline characters create new rows, and content exceeding an available width wraps by terminal cell width.

## Text Cell Measurement

Text is measured by terminal display cells rather than JavaScript string length:

- combining marks occupy zero additional cells
- ordinary narrow characters occupy one cell
- full-width and wide characters occupy two cells
- line breaks start a new row

When a double-width character cannot fit in the final remaining cell, it moves to the next row. The layout engine will not split a grapheme cluster.

ANSI input embedded directly in child text is treated as non-printing control data during measurement and preserved with its printable character when possible. View painting does not depend on embedded ANSI state.

## Box Model

Explicit `width` and `height` describe the content box. Padding and a visible border are added outside it. Margins reserve space outside the painted box.

Spacing precedence matches CSS-style shorthand expansion. From lowest to highest priority:

1. `margin` or `padding`
2. `marginHorizontal` / `marginVertical` or padding equivalents
3. side-specific properties such as `marginLeft` or `paddingTop`

An omitted dimension is automatic and is derived from normal-flow children after their margins are included. Padding and border are then added to produce the outer painted size.

If a fixed content dimension is smaller than its content, content is clipped to that dimension. If it is larger, blank cells fill the remaining content area and receive the View background paint.

A border is visible when any border property is provided. Defaults are `solid`, `normal`, and `white`. It occupies one cell on every side.

Border glyph families are:

- `solid` + `normal`: light box-drawing glyphs
- `solid` + `bold`: heavy box-drawing glyphs
- `dotted`: dotted line glyphs with matching corners
- `doubleline`: double-line box-drawing glyphs; `borderWidth` does not change this glyph family

## Normal Flow

Without `display: "flex"`, View behaves as a block container. Children are placed vertically in source order. The widest outer child determines automatic content width, and the sum of outer child heights determines automatic content height.

With `display: "flex"`, the default `flexDirection` is `row`:

- `row`: child outer widths form the main-axis size; the largest child outer height forms the cross-axis size
- `column`: child outer heights form the main-axis size; the largest child outer width forms the cross-axis size

The engine does not implement wrapping because `ViewStyle` has no flex-wrap property.

`justifyContent` distributes remaining main-axis space:

- `flex-start`: no leading space
- `center`: half the available space before the first item
- `flex-end`: all available space before the first item
- `space-between`: equal space between items; a single item starts at the beginning
- `space-evenly`: equal conceptual slots before, between, and after items, with integer rounding distributed from the leading edge

`alignItems` positions each normal-flow child on the cross axis. `stretch` expands an auto-sized child on the cross axis but does not override an explicit child dimension. `flex-start`, `center`, and `flex-end` position without resizing.

Margins are included in alignment and distribution calculations. Adjacent vertical margins do not collapse.

## Positioning and Stacking

`position` defaults to `static`.

- `static`: participates in normal flow; offsets are ignored
- `relative`: participates in normal flow at its original size, then its painted box is offset visually
- `absolute`: does not contribute to the parent's automatic size and is positioned relative to the parent's content box

For a positioned axis, `left` or `top` wins when both opposing offsets are present. Otherwise `right` or `bottom` positions the far edge against the parent's content box. Missing offsets resolve to the normal-flow location for relative elements and zero for absolute elements.

Painting is stable and ordered first by `zIndex` ascending and then by source order. Higher z-index content overwrites lower z-index cells. Children are clipped at the parent's content edge; margins may affect placement but are never painted.

## Backgrounds and Gradients

Background paint covers the View's content and padding boxes, excluding the border cells.

Named terminal colors resolve to fixed RGB values for interpolation. Hex values accept three- or six-digit forms. Solid backgrounds use the resolved color directly.

For a gradient, each paintable cell center is projected onto the vector defined by `rotation`. The minimum and maximum projections of the painted rectangle map to the start and end colors. RGB channels are linearly interpolated and rounded to the nearest integer.

When color output is unavailable, layout characters and spacing remain identical and color escape sequences are omitted.

## Error Handling

Layout should remain deterministic for malformed runtime values even if TypeScript was bypassed:

- non-finite dimensions and spacing resolve to zero
- invalid colors produce no paint instead of throwing during a React commit
- empty Views may have zero automatic content size, but explicit padding, border, width, or height still produces a box
- a zero width or height clips the corresponding content axis

The renderer must not write partial output if layout throws unexpectedly. It retains the previous terminal frame and reports the render error through the existing reconciler error path.

## Source Organization

The layout implementation will be split by responsibility under `src/render/layout/`:

- cell and box types plus grid utilities
- terminal text measurement and wrapping
- spacing and box-model resolution
- flow and flex layout
- positioned composition and z-index handling
- color resolution, gradient interpolation, and ANSI serialization
- View tree orchestration

`src/render/reconciler/index.ts` will invoke the layout pipeline instead of flattening the host tree directly. `src/render/reconciler/components/View.ts` remains the View host definition and delegates View-specific rendering to the layout layer. Text component source and `TextStyle` stay unchanged.

## Testing Strategy

Tests will exercise observable output from real host trees and pure layout inputs. Implementation follows red-green-refactor in this order:

1. terminal-cell text measurement, explicit dimensions, wrapping, clipping, and padding
2. margin/padding precedence and automatic content sizing
3. block flow and row/column flex flow
4. justify and align behavior, including stretch
5. relative/absolute positioning and stable z-index composition
6. border glyph selection and occupied dimensions
7. solid backgrounds and rotated gradient interpolation
8. reconciler integration, rerendering, and preservation of existing terminal lifecycle behavior
9. type contract confirming corrected `alignItems` values and unchanged Text props inference

Each behavior receives a failing test before production implementation. Final verification runs the build, runtime tests, type tests, path-alias test, and diff whitespace check.

## Compatibility Boundaries

This change deliberately does not implement or modify:

- any `TextStyle` property
- inline text styling semantics
- flex grow, flex shrink, basis, wrap, or gap
- percentage or viewport units
- margin collapsing
- scroll containers or overflow configuration
- mouse hit testing or focus navigation

These can be layered on the cell model later without replacing the View layout architecture.
