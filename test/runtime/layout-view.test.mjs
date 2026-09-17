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
