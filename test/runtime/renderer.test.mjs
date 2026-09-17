import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import Renderer from "../../.cache/reconciler-runtime/render/index.js";

const INITIALIZE_TERMINAL =
    "\u001B[2J\u001B[H\u001B[?25l\n\n\n\u001B[H";
const RESTORE_TERMINAL = "\u001B[?25h";

function restoreProperty(target, property, descriptor) {
    if (descriptor === undefined) {
        delete target[property];
        return;
    }

    Object.defineProperty(target, property, descriptor);
}

function captureTtyOutput(callback) {
    const isTtyDescriptor = Object.getOwnPropertyDescriptor(
        process.stdout,
        "isTTY",
    );
    const writeDescriptor = Object.getOwnPropertyDescriptor(
        process.stdout,
        "write",
    );
    const rowsDescriptor = Object.getOwnPropertyDescriptor(
        process.stdout,
        "rows",
    );
    let output = "";

    Object.defineProperty(process.stdout, "isTTY", {
        configurable: true,
        value: true,
    });
    Object.defineProperty(process.stdout, "write", {
        configurable: true,
        value(chunk) {
            output += String(chunk);
            return true;
        },
    });
    Object.defineProperty(process.stdout, "rows", {
        configurable: true,
        value: 3,
    });

    try {
        callback();
    } finally {
        restoreProperty(process.stdout, "rows", rowsDescriptor);
        restoreProperty(process.stdout, "write", writeDescriptor);
        restoreProperty(process.stdout, "isTTY", isTtyDescriptor);
    }

    return output;
}

function countOccurrences(value, searchValue) {
    return value.split(searchValue).length - 1;
}

test("initializes once and leaves the final frame visible on unmount", () => {
    const output = captureTtyOutput(() => {
        const renderer = new Renderer();

        renderer.render(createElement("noctis-text", null, "first"));
        renderer.render(createElement("noctis-text", null, "second"));
        renderer.unmount();
        renderer.unmount();
    });

    assert.equal(countOccurrences(output, INITIALIZE_TERMINAL), 1);
    assert.equal(countOccurrences(output, RESTORE_TERMINAL), 1);
    assert.ok(output.startsWith(INITIALIZE_TERMINAL));
    assert.ok(output.endsWith(`second\n${RESTORE_TERMINAL}`));
    assert.equal(output.includes("\u001B[?1049h"), false);
    assert.equal(output.includes("\u001B[?1049l"), false);
});
