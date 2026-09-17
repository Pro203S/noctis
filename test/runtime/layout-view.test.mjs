import assert from "node:assert/strict";
import test from "node:test";
import { gridToPlainText } from "../../.cache/reconciler-runtime/render/layout/grid.js";
import { textToGrid } from "../../.cache/reconciler-runtime/render/layout/text.js";
import { layoutView } from "../../.cache/reconciler-runtime/render/layout/view.js";

const ZERO_EDGES = { top: 0, right: 0, bottom: 0, left: 0 };

function textChild(text, sourceIndex = 0) {
    return {
        sourceIndex,
        layout(constraints = {}) {
            return {
                grid: textToGrid(text, constraints.maxWidth),
                margin: ZERO_EDGES,
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
    assert.equal(
        gridToPlainText(result.grid),
        "     \n     \n   x \n     \n     ",
    );
});

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
                margin: ZERO_EDGES,
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
