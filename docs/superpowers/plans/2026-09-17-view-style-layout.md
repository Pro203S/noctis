# ViewStyle 2D Cell Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement every `ViewStyle` property with a CSS-like, content-sized two-dimensional terminal cell layout engine while leaving `TextStyle` behavior unchanged.

**Architecture:** Keep the React reconciler host tree, but replace flat child-string concatenation with a recursive layout pass. Each View produces a transparent `CellGrid`, normal flow and positioning compose child grids, paint fills cells, and only the completed root grid is serialized to ANSI text.

**Tech Stack:** TypeScript 7, React 19, `react-reconciler`, Node.js 20+, Node test runner, Chalk 6, `string-width` 8.2.2, `ansi-regex` 6.3.0.

**Spec:** `docs/superpowers/specs/2026-09-17-view-style-layout-design.md`

## Global Constraints

- Do not add, remove, or implement any `TextStyle` property.
- Do not modify `src/components/Text.ts` or `src/render/reconciler/components/Text.ts` except where a compile-only generic signature adaptation is unavoidable; no Text behavior may change.
- Ordinary Views auto-size to their normal-flow children.
- Explicit `width` and `height` describe the content box; padding and border add to them.
- Block flow is vertical. `display: "flex"` defaults to a row.
- Fixed dimensions clip overflow because ViewStyle has no overflow property.
- `backgroundGradient.rotation` follows CSS angle semantics and is normalized modulo 360.
- `alignItems` accepts only `stretch`, `center`, `flex-start`, and `flex-end`.
- Layout dimensions use terminal display cells, not JavaScript string length.
- Preserve all unrelated dirty-worktree changes; stage only files named by the active task.
- Every production behavior must be preceded by a failing test and a verified RED run.

## File Map

- `src/render/layout/types.ts`: immutable layout interfaces shared across the layout pipeline.
- `src/render/layout/grid.ts`: cell-grid creation, cropping, resizing, glyph-safe overlay, and plain serialization.
- `src/render/layout/text.ts`: grapheme segmentation, terminal-width measurement, newline handling, and wrapping.
- `src/render/layout/style.ts`: numeric normalization, shorthand edge resolution, positioning metadata, and color parsing.
- `src/render/layout/view.ts`: View box model, block/flex flow, alignment, positioning, border/background painting, and z-index composition.
- `src/render/layout/color.ts`: RGB interpolation, rotated gradient painting, and ANSI serialization.
- `src/render/layout/index.ts`: public layout entry points and root-grid composition.
- `src/render/reconciler/components/View.ts`: typed View host adapter that delegates to the layout engine.
- `src/render/reconciler/index.ts`: recursively constructs layout children and redraws the serialized root grid.
- `src/render/styles.ts`: correct the View-only style contract; do not alter `TextStyle`.
- `test/runtime/layout-text.test.mjs`: cell width, grapheme, wrapping, and grid primitive behavior.
- `test/runtime/layout-view.test.mjs`: View sizing, box model, flow, positioning, borders, and paint behavior.
- `test/runtime/renderer.test.mjs`: React/reconciler integration and terminal lifecycle regression behavior.
- `test/types/reconciler.test.ts`: View renderer props/result inference and `alignItems` type contract.

---

### Task 1: Terminal Cell and Text Primitives

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `src/render/layout/types.ts`
- Create: `src/render/layout/grid.ts`
- Create: `src/render/layout/text.ts`
- Create: `test/runtime/layout-text.test.mjs`

**Interfaces:**
- Produces: `Cell`, `CellGrid`, `LayoutConstraints`, `LayoutResult`, `LayoutChild`, and `Edges` from `types.ts`.
- Produces: `createGrid(width, height)`, `placeGlyph(grid, x, y, value, width, ansiPrefix?, ansiSuffix?)`, `cropGrid(grid, width, height)`, `resizeGrid(grid, width, height)`, `overlayGrid(target, source, x, y)`, and `gridToPlainText(grid)` from `grid.ts`.
- Produces: `textToGrid(text, maxWidth?)` from `text.ts`.

- [ ] **Step 1: Add the failing text/grid tests and test script entry**

Append `test/runtime/layout-text.test.mjs` to `test:reconciler-runtime`, then create:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
    createGrid,
    gridToPlainText,
    overlayGrid,
} from "../../.cache/reconciler-runtime/render/layout/grid.js";
import { textToGrid } from "../../.cache/reconciler-runtime/render/layout/text.js";

test("measures and wraps text by terminal cells", () => {
    const grid = textToGrid("A한👨‍👩‍👧‍👦B", 4);

    assert.deepEqual(
        { width: grid.width, height: grid.height },
        { width: 4, height: 2 },
    );
    assert.equal(gridToPlainText(grid), "A한 \n👨‍👩‍👧‍👦B ");
});

test("preserves explicit newlines and empty rows", () => {
    const grid = textToGrid("ab\n\ncd");

    assert.deepEqual(
        { width: grid.width, height: grid.height },
        { width: 2, height: 3 },
    );
    assert.equal(gridToPlainText(grid), "ab\n  \ncd");
});

test("measures ANSI as zero width and preserves its control sequences", () => {
    const styled = "\u001B[31m한\u001B[0m";
    const grid = textToGrid(styled, 2);

    assert.deepEqual(
        { width: grid.width, height: grid.height },
        { width: 2, height: 1 },
    );
    assert.equal(gridToPlainText(grid), styled);
});

test("clips overlays and keeps the target dimensions", () => {
    const target = createGrid(3, 2);
    const source = textToGrid("abcd");

    overlayGrid(target, source, 1, 1);

    assert.equal(gridToPlainText(target), "   \n ab");
});
```

- [ ] **Step 2: Run the text/grid tests to verify RED**

Run: `npm run test:reconciler-runtime`

Expected: compilation fails because `render/layout/grid.js` and `render/layout/text.js` do not exist.

- [ ] **Step 3: Add the display-width dependency and TypeScript Intl types**

Add `"string-width": "^8.2.2"` and `"ansi-regex": "^6.3.0"` to runtime dependencies. Add `"ES2022.Intl"` to `compilerOptions.lib` without changing the ES6 output target. Generate or update the npm lockfile with `npm install --package-lock-only`.

- [ ] **Step 4: Define the shared layout types**

Create `src/render/layout/types.ts` with these exported contracts:

```ts
import type { ViewStyle } from "../styles.js";

export type ResolvedColor = readonly [red: number, green: number, blue: number];

export type Cell = {
    character: string;
    span: 0 | 1 | 2;
    transparent: boolean;
    ansiPrefix: string;
    ansiSuffix: string;
    foreground?: ResolvedColor;
    background?: ResolvedColor;
};

export type CellGrid = {
    readonly width: number;
    readonly height: number;
    readonly cells: Cell[][];
};

export type Edges = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type LayoutConstraints = {
    maxWidth?: number;
    maxHeight?: number;
    stretchWidth?: number;
    stretchHeight?: number;
};

export type LayoutPosition = {
    mode: "static" | "relative" | "absolute";
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    zIndex: number;
};

export type LayoutResult = {
    readonly grid: CellGrid;
    readonly margin: Edges;
    readonly position: LayoutPosition;
    readonly autoWidth: boolean;
    readonly autoHeight: boolean;
};

export type LayoutChild = {
    readonly sourceIndex: number;
    readonly layout: (constraints?: LayoutConstraints) => LayoutResult;
};

export type ViewLayoutInput = {
    readonly style: Readonly<ViewStyle>;
    readonly children: readonly LayoutChild[];
};
```

- [ ] **Step 5: Implement transparent grids and grapheme-safe wrapping**

Implement `grid.ts` so new grids contain distinct transparent cells, wide glyph continuation cells use `span: 0`, overlay skips transparent cells, and overwriting either half of a wide glyph clears the entire old glyph first.

Implement `text.ts` using one module-level `Intl.Segmenter`, `ansi-regex`, and `string-width`:

```ts
import ansiRegex from "ansi-regex";
import stringWidth from "string-width";
import { createGrid, placeGlyph } from "./grid.js";
import type { CellGrid } from "./types.js";

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

type TextToken =
    | { kind: "ansi"; value: string }
    | { kind: "grapheme"; value: string };

type Glyph = {
    segment: string;
    width: 1 | 2;
    prefix: string;
    suffix: string;
};

function appendGraphemes(tokens: TextToken[], value: string): void {
    for (const { segment } of graphemes.segment(value)) {
        tokens.push({ kind: "grapheme", value: segment });
    }
}

function tokenize(text: string): TextToken[] {
    const tokens: TextToken[] = [];
    const pattern = ansiRegex();
    let textIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        appendGraphemes(tokens, text.slice(textIndex, match.index));
        tokens.push({ kind: "ansi", value: match[0] });
        textIndex = match.index + match[0].length;
    }

    appendGraphemes(tokens, text.slice(textIndex));
    return tokens;
}

export function textToGrid(text: string, maxWidth?: number): CellGrid {
    const limit = maxWidth === undefined
        ? undefined
        : Math.max(0, Math.floor(maxWidth));
    const rows: Glyph[][] = [[]];
    const widths = [0];
    let pendingAnsi = "";

    for (const token of tokenize(text)) {
        if (token.kind === "ansi") {
            pendingAnsi += token.value;
            continue;
        }

        const segment = token.value;
        if (segment === "\n") {
            rows.push([]);
            widths.push(0);
            continue;
        }

        const width = Math.min(2, stringWidth(segment));
        if (width === 0) {
            const row = rows[rows.length - 1];
            const glyph = row[row.length - 1];
            if (glyph !== undefined) glyph.segment += segment;
            continue;
        }

        const rowIndex = rows.length - 1;
        if (limit !== undefined && widths[rowIndex] > 0 && widths[rowIndex] + width > limit) {
            rows.push([]);
            widths.push(0);
        }

        if (limit === 0 || (limit !== undefined && width > limit)) continue;
        rows[rows.length - 1].push({
            segment,
            width: width as 1 | 2,
            prefix: pendingAnsi,
            suffix: "",
        });
        pendingAnsi = "";
        widths[widths.length - 1] += width;
    }

    for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
        const row = rows[rowIndex];
        const glyph = row[row.length - 1];
        if (glyph !== undefined) {
            glyph.suffix += pendingAnsi;
            break;
        }
    }

    if (text === "") return createGrid(0, 0);
    const width = limit ?? Math.max(0, ...widths);
    const grid = createGrid(width, rows.length);
    rows.forEach((row, y) => {
        let x = 0;
        row.forEach((glyph) => {
            placeGlyph(
                grid,
                x,
                y,
                glyph.segment,
                glyph.width,
                glyph.prefix,
                glyph.suffix,
            );
            x += glyph.width;
        });
    });
    return grid;
}
```

`gridToPlainText()` includes each occupied cell's `ansiPrefix` and `ansiSuffix` around its grapheme. Grid cropping and overlay copy these fields together with the glyph so control bytes never affect cell dimensions.

- [ ] **Step 6: Run the text/grid tests to verify GREEN**

Run: `npm run test:reconciler-runtime`

Expected: all existing runtime tests plus the four new text/grid tests pass.

- [ ] **Step 7: Commit the primitive layer**

```powershell
git add -- package.json package-lock.json tsconfig.json src/render/layout/types.ts src/render/layout/grid.ts src/render/layout/text.ts test/runtime/layout-text.test.mjs
git commit -m "feat: add terminal cell layout primitives"
```

---

### Task 2: View Style Normalization and Box Model

**Files:**
- Create: `src/render/layout/style.ts`
- Create: `src/render/layout/view.ts`
- Create: `test/runtime/layout-view.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `CellGrid`, `Edges`, `LayoutChild`, `LayoutConstraints`, and `LayoutResult` from Task 1.
- Produces: `normalizeCellCount(value, allowNegative?)`, `resolveSpacing(style, kind)`, and `resolvePosition(style)` from `style.ts`.
- Produces: `layoutView(input, constraints?)` from `view.ts`.

- [ ] **Step 1: Write failing content-box and spacing tests**

Add `layout-view.test.mjs` to the runtime script and create fixtures using a child whose `layout()` returns `textToGrid(text, constraints?.maxWidth)`.

```js
import assert from "node:assert/strict";
import test from "node:test";
import { gridToPlainText } from "../../.cache/reconciler-runtime/render/layout/grid.js";
import { textToGrid } from "../../.cache/reconciler-runtime/render/layout/text.js";
import { layoutView } from "../../.cache/reconciler-runtime/render/layout/view.js";

function textChild(text, sourceIndex = 0) {
    return {
        sourceIndex,
        layout(constraints = {}) {
            return {
                grid: textToGrid(text, constraints.maxWidth),
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
                position: { mode: "static", zIndex: 0 },
                autoWidth: true,
                autoHeight: true,
            };
        },
    };
}

function viewChild(style, text, sourceIndex = 0) {
    return {
        sourceIndex,
        layout(constraints = {}) {
            return layoutView({
                style,
                children: text === "" ? [] : [textChild(text)],
            }, constraints);
        },
    };
}

test("uses explicit dimensions as a padded and clipped content box", () => {
    const result = layoutView({
        style: { width: 4, height: 4 },
        children: [textChild("abcdef\nxy")],
    });

    assert.equal(gridToPlainText(result.grid), "abcd\nef  \nxy  \n    ");
});

test("resolves padding side precedence around auto-sized content", () => {
    const result = layoutView({
        style: {
            padding: 1,
            paddingHorizontal: 2,
            paddingLeft: 3,
        },
        children: [textChild("x")],
    });

    assert.deepEqual(
        { width: result.grid.width, height: result.grid.height },
        { width: 6, height: 3 },
    );
    assert.equal(gridToPlainText(result.grid), "      \n   x  \n      ");
});

test("resolves margin side precedence without painting margin cells", () => {
    const child = viewChild({
        margin: 1,
        marginVertical: 2,
        marginLeft: 3,
    }, "x", 0);
    const result = layoutView({ style: {}, children: [child] });

    assert.deepEqual(
        { width: result.grid.width, height: result.grid.height },
        { width: 5, height: 5 },
    );
    assert.equal(gridToPlainText(result.grid), "     \n     \n   x \n     \n     ");
});
```

- [ ] **Step 2: Run the View tests to verify RED**

Run: `npm run test:reconciler-runtime`

Expected: compilation fails because `layout/view.js` and `layout/style.js` do not exist.

- [ ] **Step 3: Implement value and edge resolution**

Implement precedence by applying shorthand, then axis, then side values:

```ts
export function normalizeCellCount(
    value: unknown,
    allowNegative = false,
): number | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    const integer = Math.floor(value);
    return allowNegative ? integer : Math.max(0, integer);
}

export function resolveSpacing(
    style: Readonly<ViewStyle>,
    kind: "margin" | "padding",
): Edges {
    const all = normalizeCellCount(style[kind]) ?? 0;
    const horizontal = normalizeCellCount(style[`${kind}Horizontal`]) ?? all;
    const vertical = normalizeCellCount(style[`${kind}Vertical`]) ?? all;
    return {
        top: normalizeCellCount(style[`${kind}Top`]) ?? vertical,
        right: normalizeCellCount(style[`${kind}Right`]) ?? horizontal,
        bottom: normalizeCellCount(style[`${kind}Bottom`]) ?? vertical,
        left: normalizeCellCount(style[`${kind}Left`]) ?? horizontal,
    };
}
```

Use typed helper overloads or explicit property reads so indexing remains strict without changing the public style type.

- [ ] **Step 4: Implement automatic block sizing and content-box clipping**

`layoutView()` must:

1. resolve explicit dimensions and constraints;
2. lay out non-absolute children vertically;
3. derive auto content width from the widest child outer width and auto height from the sum of child outer heights;
4. wrap a direct text child to an explicit content width;
5. create the content grid at the resolved size;
6. overlay children in vertical order;
7. add padding using `resizeGrid` plus an offset overlay;
8. return margin and positioning metadata without painting margin cells.

Use this signature:

```ts
export function layoutView(
    input: ViewLayoutInput,
    constraints: LayoutConstraints = {},
): LayoutResult;
```

When `style.width` is absent, `constraints.stretchWidth` supplies the content width; otherwise natural width is capped only by `constraints.maxWidth`. Apply the same rule to height.

- [ ] **Step 5: Run the View tests to verify GREEN**

Run: `npm run test:reconciler-runtime`

Expected: all runtime tests pass, including the explicit content-box and padding precedence cases.

- [ ] **Step 6: Commit the View box model**

```powershell
git add -- package.json src/render/layout/style.ts src/render/layout/view.ts test/runtime/layout-view.test.mjs
git commit -m "feat: add View box model layout"
```

---

### Task 3: Block and Flex Flow

**Files:**
- Modify: `src/render/layout/view.ts`
- Modify: `test/runtime/layout-view.test.mjs`

**Interfaces:**
- Consumes: `layoutView(input, constraints?)` from Task 2.
- Produces: complete normal-flow placement for block, flex row, and flex column layouts.

- [ ] **Step 1: Add failing flex distribution and alignment tests**

Append literal-output tests:

```js
test("lays flex children in a row with space-between", () => {
    const result = layoutView({
        style: {
            display: "flex",
            width: 8,
            height: 2,
            justifyContent: "space-between",
            alignItems: "flex-end",
        },
        children: [textChild("A", 0), textChild("B", 1), textChild("C", 2)],
    });

    assert.equal(gridToPlainText(result.grid), "        \nA   B  C");
});

test("stretches auto-sized children on a column cross axis", () => {
    const calls = [];
    const child = {
        sourceIndex: 0,
        layout(constraints = {}) {
            calls.push(constraints);
            const width = constraints.stretchWidth ?? 1;
            return {
                grid: textToGrid("x".padEnd(width)),
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
                position: { mode: "static", zIndex: 0 },
                autoWidth: true,
                autoHeight: true,
            };
        },
    };
    const result = layoutView({
        style: {
            display: "flex",
            flexDirection: "column",
            width: 4,
            alignItems: "stretch",
        },
        children: [child],
    });

    assert.equal(gridToPlainText(result.grid), "x   ");
    assert.deepEqual(calls.at(-1), { stretchWidth: 4 });
});

test("stacks block children vertically", () => {
    const result = layoutView({
        style: {},
        children: [textChild("AA", 0), textChild("B", 1)],
    });

    assert.equal(gridToPlainText(result.grid), "AA\nB ");
});

test("implements every justifyContent distribution", () => {
    const cases = [
        ["flex-start", "AB     "],
        ["center", "  AB   "],
        ["flex-end", "     AB"],
        ["space-between", "A     B"],
        ["space-evenly", "  A  B "],
    ];

    for (const [justifyContent, expected] of cases) {
        const result = layoutView({
            style: { display: "flex", width: 7, justifyContent },
            children: [textChild("A", 0), textChild("B", 1)],
        });
        assert.equal(gridToPlainText(result.grid), expected, justifyContent);
    }
});

test("implements every non-stretch cross-axis alignment", () => {
    const cases = [
        ["flex-start", "A  \n   \n   "],
        ["center", "   \nA  \n   "],
        ["flex-end", "   \n   \nA  "],
    ];

    for (const [alignItems, expected] of cases) {
        const result = layoutView({
            style: { display: "flex", width: 3, height: 3, alignItems },
            children: [textChild("A")],
        });
        assert.equal(gridToPlainText(result.grid), expected, alignItems);
    }
});

test("uses height as the main axis for flex columns", () => {
    const result = layoutView({
        style: {
            display: "flex",
            flexDirection: "column",
            width: 3,
            height: 5,
            justifyContent: "space-between",
            alignItems: "flex-end",
        },
        children: [textChild("A", 0), textChild("B", 1)],
    });

    assert.equal(gridToPlainText(result.grid), "  A\n   \n   \n   \n  B");
});
```

- [ ] **Step 2: Run the flex tests to verify RED**

Run: `npm run test:reconciler-runtime`

Expected: the row is rendered vertically or spacing/alignment differs from the literal expected output, and the stretch constraint is absent.

- [ ] **Step 3: Implement axis-independent flex placement**

Inside `view.ts`, represent each normal-flow child using main/cross sizes including margins. Resolve free main-axis space with:

```ts
type Distribution = { leading: number; gaps: number[] };

function distribute(
    freeSpace: number,
    itemCount: number,
    mode: ViewStyle["justifyContent"],
): Distribution;
```

For `space-between`, distribute integer remainder from the first gap forward. For `space-evenly`, compute `itemCount + 1` slots, distribute the remainder from the leading slot forward, and use the interior slots as gaps. Center places `Math.floor(freeSpace / 2)` cells before the first child.

Use axis adapters so one placement loop handles row and column. Cross-axis `stretch` must re-run only auto-sized children with `stretchWidth` or `stretchHeight`; explicit dimensions remain unchanged.

- [ ] **Step 4: Run all runtime tests to verify GREEN**

Run: `npm run test:reconciler-runtime`

Expected: all runtime tests pass, including block behavior from Task 2 and the new flex cases.

- [ ] **Step 5: Commit flex flow**

```powershell
git add -- src/render/layout/view.ts test/runtime/layout-view.test.mjs
git commit -m "feat: implement View flex layout"
```

---

### Task 4: Relative, Absolute, and Z-Index Composition

**Files:**
- Modify: `src/render/layout/style.ts`
- Modify: `src/render/layout/view.ts`
- Modify: `test/runtime/layout-view.test.mjs`

**Interfaces:**
- Consumes: View flow placements from Task 3.
- Produces: CSS-like position offsets and stable z-index paint ordering.

- [ ] **Step 1: Add failing position and overlap tests**

Reuse the `viewChild(style, text, sourceIndex)` fixture from Task 2 and append:

```js
test("keeps relative layout space while moving its paint", () => {
    const result = layoutView({
        style: { width: 4, height: 2 },
        children: [
            viewChild({ position: "relative", left: 1 }, "A", 0),
            textChild("B", 1),
        ],
    });

    assert.equal(gridToPlainText(result.grid), " A  \nB   ");
});

test("excludes absolute children from auto size and paints by zIndex", () => {
    const result = layoutView({
        style: { width: 3, height: 1 },
        children: [
            viewChild({ position: "absolute", left: 0, zIndex: 2 }, "A", 0),
            viewChild({ position: "absolute", left: 0, zIndex: 1 }, "B", 1),
        ],
    });

    assert.equal(gridToPlainText(result.grid), "A  ");
});

test("positions an absolute child from right and bottom", () => {
    const result = layoutView({
        style: { width: 4, height: 2 },
        children: [
            viewChild({ position: "absolute", right: 0, bottom: 0 }, "X", 0),
        ],
    });

    assert.equal(gridToPlainText(result.grid), "    \n   X");
});

test("keeps absolute children out of auto sizing and static offsets inert", () => {
    const absoluteOnly = layoutView({
        style: {},
        children: [viewChild({ position: "absolute" }, "X", 0)],
    });
    const staticChild = layoutView({
        style: { width: 2, height: 1 },
        children: [viewChild({ position: "static", left: 1 }, "X", 0)],
    });

    assert.deepEqual(
        { width: absoluteOnly.grid.width, height: absoluteOnly.grid.height },
        { width: 0, height: 0 },
    );
    assert.equal(gridToPlainText(staticChild.grid), "X ");
});

test("uses source order when overlapping zIndex values are equal", () => {
    const result = layoutView({
        style: { width: 1, height: 1 },
        children: [
            viewChild({ position: "absolute", zIndex: 1 }, "A", 0),
            viewChild({ position: "absolute", zIndex: 1 }, "B", 1),
        ],
    });

    assert.equal(gridToPlainText(result.grid), "B");
});
```

- [ ] **Step 2: Run the position tests to verify RED**

Run: `npm run test:reconciler-runtime`

Expected: relative offsets, absolute far-edge placement, or z-index ordering differ from the expected grids.

- [ ] **Step 3: Resolve position metadata and compose paint records**

Implement `resolvePosition()` so static ignores offsets, left/top take precedence over right/bottom, offsets use `normalizeCellCount(value, true)`, and invalid `zIndex` becomes zero.

In `layoutView()`, retain flow coordinates as records:

```ts
type PaintRecord = {
    result: LayoutResult;
    flowX: number;
    flowY: number;
    sourceIndex: number;
};
```

Compute visual coordinates after content size is known. Sort a copied paint-record array by `zIndex`, then `sourceIndex`, and overlay into the clipped content grid. Never sort or mutate the React child array.

- [ ] **Step 4: Run runtime tests to verify GREEN**

Run: `npm run test:reconciler-runtime`

Expected: all runtime tests pass with exact literal grids for relative, absolute, and overlap cases.

- [ ] **Step 5: Commit positioning**

```powershell
git add -- src/render/layout/style.ts src/render/layout/view.ts test/runtime/layout-view.test.mjs
git commit -m "feat: add positioned View composition"
```

---

### Task 5: Borders and Box Dimensions

**Files:**
- Modify: `src/render/layout/view.ts`
- Modify: `test/runtime/layout-view.test.mjs`

**Interfaces:**
- Consumes: final content/padding grid from Task 4.
- Produces: `resolveBorder(style)` and one-cell border painting inside `view.ts`.

- [ ] **Step 1: Add failing border glyph and size tests**

```js
test("adds a normal solid border outside the content box", () => {
    const result = layoutView({
        style: { width: 2, height: 1, borderStyle: "solid" },
        children: [textChild("x")],
    });

    assert.deepEqual(
        { width: result.grid.width, height: result.grid.height },
        { width: 4, height: 3 },
    );
    assert.equal(gridToPlainText(result.grid), "┌──┐\n│x │\n└──┘");
});

test("uses heavy and double border glyph families", () => {
    const heavy = layoutView({
        style: { width: 1, height: 1, borderWidth: "bold" },
        children: [],
    });
    const doubled = layoutView({
        style: { width: 1, height: 1, borderStyle: "doubleline" },
        children: [],
    });

    assert.equal(gridToPlainText(heavy.grid), "┏━┓\n┃ ┃\n┗━┛");
    assert.equal(gridToPlainText(doubled.grid), "╔═╗\n║ ║\n╚═╝");
});

test("uses dotted edge glyphs", () => {
    const result = layoutView({
        style: { width: 1, height: 1, borderStyle: "dotted" },
        children: [],
    });

    assert.equal(gridToPlainText(result.grid), "┌┄┐\n┊ ┊\n└┄┘");
});
```

- [ ] **Step 2: Run border tests to verify RED**

Run: `npm run test:reconciler-runtime`

Expected: dimensions lack two border cells and border glyphs are absent.

- [ ] **Step 3: Paint border families around the padded grid**

Use exact glyph maps:

```ts
const BORDER_GLYPHS = {
    solid: {
        normal: { top: "─", right: "│", bottom: "─", left: "│", tl: "┌", tr: "┐", br: "┘", bl: "└" },
        bold: { top: "━", right: "┃", bottom: "━", left: "┃", tl: "┏", tr: "┓", br: "┛", bl: "┗" },
    },
    dotted: {
        normal: { top: "┄", right: "┊", bottom: "┄", left: "┊", tl: "┌", tr: "┐", br: "┘", bl: "└" },
        bold: { top: "┅", right: "┋", bottom: "┅", left: "┋", tl: "┏", tr: "┓", br: "┛", bl: "┗" },
    },
    doubleline: {
        normal: { top: "═", right: "║", bottom: "═", left: "║", tl: "╔", tr: "╗", br: "╝", bl: "╚" },
        bold: { top: "═", right: "║", bottom: "═", left: "║", tl: "╔", tr: "╗", br: "╝", bl: "╚" },
    },
} as const;
```

Any provided border property activates the border. Default missing values to solid, normal, and white. Set `foreground` on every border cell when `borderColor` resolves successfully.

- [ ] **Step 4: Run runtime tests to verify GREEN**

Run: `npm run test:reconciler-runtime`

Expected: all runtime tests pass with exact border dimensions and glyphs.

- [ ] **Step 5: Commit borders**

```powershell
git add -- src/render/layout/view.ts test/runtime/layout-view.test.mjs
git commit -m "feat: render View borders"
```

---

### Task 6: Background Colors, Rotated Gradients, and ANSI Serialization

**Files:**
- Create: `src/render/layout/color.ts`
- Modify: `src/render/layout/style.ts`
- Modify: `src/render/layout/view.ts`
- Modify: `test/runtime/layout-view.test.mjs`

**Interfaces:**
- Produces: `resolveColor(value)`, `interpolateColor(start, end, ratio)`, `paintBackground(grid, paint)`, and `serializeGrid(grid, colorLevel?)`.
- Consumes: content-plus-padding rectangle and border grid from Task 5.

- [ ] **Step 1: Add failing solid and rotated-gradient tests**

Assert cell RGB values independently of the terminal's detected color support:

```js
test("paints content and padding but not border with a solid background", () => {
    const result = layoutView({
        style: {
            width: 2,
            height: 1,
            padding: 1,
            borderStyle: "solid",
            backgroundColor: "#123456",
        },
        children: [],
    });

    assert.deepEqual(result.grid.cells[1][1].background, [18, 52, 86]);
    assert.equal(result.grid.cells[0][0].background, undefined);
});

test("rotates a gradient using CSS angle semantics", () => {
    const horizontal = layoutView({
        style: {
            width: 3,
            height: 1,
            backgroundGradient: {
                start: "#000000",
                end: "#ffffff",
                rotation: 90,
            },
        },
        children: [],
    });

    assert.deepEqual(
        horizontal.grid.cells[0].map((cell) => cell.background),
        [[0, 0, 0], [128, 128, 128], [255, 255, 255]],
    );
});

test("resolves named backgrounds and border foreground colors", () => {
    const result = layoutView({
        style: {
            width: 1,
            height: 1,
            borderStyle: "solid",
            borderColor: "brightRed",
            backgroundColor: "brightBlue",
        },
        children: [],
    });

    assert.deepEqual(result.grid.cells[0][0].foreground, [241, 76, 76]);
    assert.deepEqual(result.grid.cells[1][1].background, [59, 142, 234]);
});

test("maps a 180 degree gradient from top to bottom", () => {
    const result = layoutView({
        style: {
            width: 1,
            height: 3,
            backgroundGradient: {
                start: "#000",
                end: "#fff",
                rotation: 180,
            },
        },
        children: [],
    });

    assert.deepEqual(
        result.grid.cells.map((row) => row[0].background),
        [[0, 0, 0], [128, 128, 128], [255, 255, 255]],
    );
});
```

Add a serialization assertion using forced truecolor:

```js
test("serializes adjacent cell colors and resets at line boundaries", () => {
    const result = layoutView({
        style: { width: 1, height: 1, backgroundColor: "#123456" },
        children: [textChild("x")],
    });

    assert.equal(
        serializeGrid(result.grid, 3),
        "\u001B[48;2;18;52;86mx\u001B[0m",
    );
});
```

- [ ] **Step 2: Run paint tests to verify RED**

Run: `npm run test:reconciler-runtime`

Expected: color module imports fail or cell background values remain undefined.

- [ ] **Step 3: Implement color resolution and 2D projection**

Resolve the 16 named colors through this fixed RGB map and expand three-digit hex values by duplicating each digit. Return `undefined` for invalid runtime input.

```ts
const NAMED_COLORS = {
    black: [0, 0, 0],
    red: [205, 49, 49],
    green: [13, 188, 121],
    yellow: [229, 229, 16],
    blue: [36, 114, 200],
    magenta: [188, 63, 188],
    cyan: [17, 168, 205],
    white: [229, 229, 229],
    brightBlack: [102, 102, 102],
    brightRed: [241, 76, 76],
    brightGreen: [35, 209, 139],
    brightYellow: [245, 245, 67],
    brightBlue: [59, 142, 234],
    brightMagenta: [214, 112, 214],
    brightCyan: [41, 184, 219],
    brightWhite: [255, 255, 255],
} as const satisfies Record<string, ResolvedColor>;
```

For a paint rectangle of width `w` and height `h`, use cell centers normalized around the rectangle center. Convert CSS degrees to a vector with:

```ts
const radians = rotation * Math.PI / 180;
const dx = Math.sin(radians);
const dy = -Math.cos(radians);
```

Project all four rectangle corners to find the minimum and maximum. Normalize each cell-center projection to `[0, 1]`; a one-cell or zero-length projection uses ratio zero. Round interpolated RGB channels with `Math.round()`.

- [ ] **Step 4: Implement ANSI serialization**

Serialize each row from left to right, skipping continuation cells (`span: 0`). Emit foreground `38;2;r;g;b` and background `48;2;r;g;b` sequences only when the active color changes. For an occupied cell, emit View foreground/background codes, then `ansiPrefix`, the grapheme, and `ansiSuffix`. Any raw ANSI prefix or suffix invalidates the serializer's tracked color state so the next cell re-emits its View colors. Reset with `\u001B[0m` before each newline and after the final colored cell. When color level is zero, omit View-generated color sequences but preserve raw child ANSI sequences.

Use `chalk.level` only to select the default color level; tests pass `3` directly and therefore do not depend on the test process TTY.

- [ ] **Step 5: Run runtime tests to verify GREEN**

Run: `npm run test:reconciler-runtime`

Expected: all runtime tests pass, including exact RGB interpolation and ANSI output.

- [ ] **Step 6: Commit View paint support**

```powershell
git add -- src/render/layout/color.ts src/render/layout/style.ts src/render/layout/view.ts test/runtime/layout-view.test.mjs
git commit -m "feat: paint View backgrounds and gradients"
```

---

### Task 7: Reconciler and View Host Integration

**Files:**
- Create: `src/render/layout/index.ts`
- Modify: `src/render/reconciler/index.ts`
- Modify: `src/render/reconciler/components/View.ts`
- Modify: `src/render/reconciler/components/index.ts`
- Modify: `test/runtime/reconciler.test.mjs`
- Modify: `test/runtime/renderer.test.mjs`
- Modify: `test/types/reconciler.test.ts`

**Interfaces:**
- Consumes: `layoutView`, `textToGrid`, root grid composition, and `serializeGrid`.
- Produces: View host render signature `render(props, children, constraints?) => LayoutResult`.
- Produces: root `renderContainer(container) => string` integration.

- [ ] **Step 1: Write failing View host and renderer integration tests**

Add a runtime test that exercises the real React host tree rather than only a mocked layout child:

```js
test("renders nested Views through the two-dimensional layout", () => {
    const output = captureTtyOutput(() => {
        const renderer = new Renderer();
        renderer.render(createElement(
            "noctis-view",
            { style: { display: "flex", width: 5, justifyContent: "space-between" } },
            createElement("noctis-text", null, "A"),
            createElement("noctis-text", null, "B"),
        ));
        renderer.unmount();
    });

    assert.ok(output.endsWith(`A   B\n${RESTORE_TERMINAL}`));
});
```

Extend the type test with:

```ts
import type { LayoutResult } from "../../.cache/reconciler-types/render/layout/types.js";
import type { ViewStyle } from "../../.cache/reconciler-types/render/styles.js";

type ViewRenderReturnsLayout = Assert<
    Equal<ReturnType<typeof viewComponent.render>, LayoutResult>
>;

const validAlignment = {
    alignItems: "stretch",
} satisfies ViewStyle;

const invalidAlignment = {
    // @ts-expect-error space distribution belongs to justifyContent
    alignItems: "space-between",
} satisfies ViewStyle;
```

- [ ] **Step 2: Run runtime and type tests to verify RED**

Run: `npm run test:reconciler-runtime`

Expected: nested View output is still flattened or the new View render type is unavailable.

Run: `npm run test:reconciler-types`

Expected: `ViewRenderReturnsLayout` fails because View currently returns a string, and `stretch` is not accepted yet.

- [ ] **Step 3: Correct only the ViewStyle alignment contract**

In `src/render/styles.ts`, change `alignItems` to:

```ts
"alignItems": "stretch" | "center" | "flex-start" | "flex-end"
```

Keep the user-added `GradientColor.rotation` field. Do not edit any line inside the `TextStyle` declaration.

- [ ] **Step 4: Generalize HostComponent render types without changing Text behavior**

Change the generic to:

```ts
export type HostComponent<
    Props extends HostProps = HostProps,
    Children = string,
    Output = string,
    Constraints = undefined,
> = Readonly<{
    type: string;
    render(props: Props, children: Children, constraints?: Constraints): Output;
}>;
```

Type the View component with `readonly LayoutChild[]`, `LayoutResult`, and `LayoutConstraints`. Its body delegates directly to `layoutView({ style: props.style ?? {}, children }, constraints)`. Keep the Text component on all default generic arguments so its code and output remain unchanged.

Update the definition registry to store only `{ type: string }` for lookup, avoiding unsafe assumptions that View and Text share render input/output types.

- [ ] **Step 5: Build layout callbacks from reconciler host children**

Add `layoutChild(child, sourceIndex)` in `src/render/layout/index.ts`. Raw text and Text hosts produce `textToGrid()` results with zero margin and static positioning. View hosts map each child to a lazy `LayoutChild` callback and invoke their component renderer with constraints.

Compose multiple root nodes vertically into a transparent root grid, then call `serializeGrid()`. Hidden instances return a zero-sized result.

Replace the old flat `renderChild()` in the reconciler with this entry point. Leave terminal diffing, the trailing terminal newline, `preserveOutput`, and unmount behavior unchanged.

- [ ] **Step 6: Run runtime and type tests to verify GREEN**

Run: `npm run test:reconciler-runtime`

Expected: all layout, reconciler, terminal initialization, and last-frame preservation tests pass.

Run: `npm run test:reconciler-types`

Expected: View props and LayoutResult inference pass, `stretch` compiles, invalid align space distribution is rejected, and Text continues using `Readonly<TextProps>` with a string return.

- [ ] **Step 7: Commit integration**

```powershell
git add -- src/render/layout/index.ts src/render/reconciler/index.ts src/render/reconciler/components/View.ts src/render/reconciler/components/index.ts src/render/styles.ts test/runtime/reconciler.test.mjs test/runtime/renderer.test.mjs test/types/reconciler.test.ts
git commit -m "feat: integrate View cell layout renderer"
```

---

### Task 8: Edge Cases, Examples, and Full Verification

**Files:**
- Modify: `test/runtime/layout-view.test.mjs`
- Modify: `test/runtime/renderer.test.mjs`
- Modify: `test/src/app/index.tsx`
- Modify as required by failing tests only: files under `src/render/layout/`

**Interfaces:**
- Consumes: the complete View layout and renderer pipeline.
- Produces: regression coverage for malformed runtime values, empty Views, clipping, repainting, and the public example.

- [ ] **Step 1: Add failing edge-case regressions**

Add literal tests for these cases:

```js
test("normalizes invalid dimensions without throwing", () => {
    const result = layoutView({
        style: { width: Number.NaN, height: -2, padding: Number.POSITIVE_INFINITY },
        children: [textChild("x")],
    });

    assert.deepEqual(
        { width: result.grid.width, height: result.grid.height },
        { width: 1, height: 0 },
    );
});

test("renders an empty View when padding or border gives it size", () => {
    const result = layoutView({
        style: { padding: 1, borderStyle: "solid" },
        children: [],
    });

    assert.deepEqual(
        { width: result.grid.width, height: result.grid.height },
        { width: 4, height: 4 },
    );
});

test("normalizes negative gradient rotation", () => {
    const negative = layoutView({
        style: {
            width: 3,
            height: 1,
            backgroundGradient: { start: "#000", end: "#fff", rotation: -270 },
        },
        children: [],
    });
    const positive = layoutView({
        style: {
            width: 3,
            height: 1,
            backgroundGradient: { start: "#000", end: "#fff", rotation: 90 },
        },
        children: [],
    });

    assert.deepEqual(negative.grid.cells, positive.grid.cells);
});

test("ignores invalid runtime colors without failing layout", () => {
    const result = layoutView({
        style: { width: 1, height: 1, backgroundColor: "#invalid" },
        children: [],
    });

    assert.equal(result.grid.cells[0][0].background, undefined);
    assert.equal(gridToPlainText(result.grid), " ");
});
```

Add a renderer rerender test proving a larger first View is completely cleared before a smaller second View is drawn, while unmount still leaves the second frame visible.

- [ ] **Step 2: Run the regression tests to verify RED where behavior is incomplete**

Run: `npm run test:reconciler-runtime`

Expected: at least one normalization, empty-box, gradient-angle, or redraw assertion fails for a specific missing edge case. If all pass, mutate the relevant production branch locally to prove the test catches the defect, revert that mutation, and record the verified mutation in the task notes before continuing.

- [ ] **Step 3: Implement only the failing edge-case branches**

Keep fixes within the responsible layout module. Do not broaden Text behavior. Ensure a zero content height remains zero even when text exists, while padding/border still contributes outer dimensions according to the box model.

- [ ] **Step 4: Update the example to demonstrate View-only styles**

Use the existing `useConsoleSize()` height and add a flex View example containing nested Views with padding, borders, a solid background, and a rotated gradient. Leave every Text `style` prop absent so the example does not imply TextStyle support.

- [ ] **Step 5: Run complete verification**

Run each command separately and require exit code zero:

```powershell
npm run pack
npm run test:path-alias
npm run test:reconciler-runtime
npm run test:reconciler-types
git diff --check
```

Expected runtime result: zero failed tests. Expected build/type result: zero diagnostics. `git diff --check` may print Windows line-ending warnings but must report no whitespace errors.

- [ ] **Step 6: Inspect the final diff for scope and TextStyle isolation**

Run:

```powershell
git diff -- src/components/Text.ts src/render/reconciler/components/Text.ts
git diff -- src/render/styles.ts
git status --short
```

Expected: no behavioral Text component diff; the `TextStyle` declaration is byte-for-byte unchanged; all remaining files are expected layout, renderer, test, example, terminal lifecycle, or package metadata changes.

- [ ] **Step 7: Commit the verified edge cases and example**

```powershell
git add -- src/render/layout test/runtime test/src/app/index.tsx
git commit -m "test: cover View layout edge cases"
```

Do not push until the user explicitly confirms the final diff and destination branch, unless the active request separately includes pushing.
