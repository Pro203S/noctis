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
