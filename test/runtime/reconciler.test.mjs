import assert from "node:assert/strict";
import test from "node:test";
import { createHostInstance } from "../../.cache/reconciler-runtime/render/reconciler/components/index.js";

test("creates a Text host instance for noctis-text", () => {
    const props = {
        style: {
            color: "red",
        },
    };

    const instance = createHostInstance("noctis-text", props);

    assert.equal(instance.type, "noctis-text");
    assert.equal(instance.kind, "component");
    assert.strictEqual(instance.props, props);
    assert.deepEqual(instance.children, []);
    assert.equal(instance.hidden, false);
});

test("Text host instance renders its children", () => {
    const instance = createHostInstance("noctis-text", {});

    assert.equal(instance.component.render(instance.props, "hello"), "hello");
});
