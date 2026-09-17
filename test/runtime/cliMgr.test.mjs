import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import CliManager from "../../.cache/reconciler-runtime/modules/cliMgr.js";

const INITIALIZE_TERMINAL = "\u001B[2J\u001B[H\u001B[?25l";
const RESTORE_TERMINAL = "\u001B[?25h";

class ProcessLifecycle extends EventEmitter {
    pid = 42;
    signals = [];

    kill(pid, signal) {
        this.signals.push({ pid, signal });
        return true;
    }
}

function createHarness(rows = 3) {
    let output = "";
    const terminal = {
        isTTY: true,
        rows,
        write(chunk) {
            output += String(chunk);
            return true;
        },
    };
    const lifecycle = new ProcessLifecycle();
    const manager = new CliManager(terminal, lifecycle);

    return {
        lifecycle,
        manager,
        output: () => output,
    };
}

test("initialization reserves the terminal height and returns home", () => {
    const { manager, output } = createHarness(3);

    manager.initialize();

    assert.equal(output(), `${INITIALIZE_TERMINAL}\n\n\n\u001B[H`);
    assert.equal(output().includes("\u001B[?1049h"), false);

    manager.restore();
});

test("process exit restores the terminal", () => {
    const { lifecycle, manager, output } = createHarness();

    manager.initialize();
    lifecycle.emit("exit", 0);

    assert.ok(output().endsWith(RESTORE_TERMINAL));
    assert.equal(output().includes("\u001B[?1049l"), false);
    assert.equal(lifecycle.listenerCount("exit"), 0);
});

test("termination signals restore the terminal and preserve default exit", () => {
    const { lifecycle, manager, output } = createHarness();

    manager.initialize();
    lifecycle.emit("SIGINT", "SIGINT");

    assert.ok(output().endsWith(RESTORE_TERMINAL));
    assert.deepEqual(lifecycle.signals, [{ pid: 42, signal: "SIGINT" }]);
});
