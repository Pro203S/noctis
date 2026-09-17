import type { ReactNode } from "react";
import { ConcurrentRoot } from "react-reconciler/constants.js";
import {
    createContainer,
    reconciler,
    type NoctisContainer,
} from "./reconciler/index.js";

type ReconcilerRoot = ReturnType<typeof reconciler.createContainer>;

let hasActiveTerminalRenderer = false;

export default class Renderer {
    readonly #container: NoctisContainer;
    readonly #root: ReconcilerRoot;
    readonly #ownsTerminal: boolean;

    #renderError: Error | null = null;
    #isRendering = false;
    #isUnmounted = false;

    constructor() {
        this.#ownsTerminal = process.stdout.isTTY === true;

        if (this.#ownsTerminal && hasActiveTerminalRenderer) {
            throw new Error("Only one terminal Renderer can be active at a time.");
        }

        this.#container = createContainer();
        this.#root = reconciler.createContainer(
            this.#container,
            ConcurrentRoot,
            null,
            false,
            null,
            "",
            (error) => this.#handleUncaughtError(error),
            (error) => console.error(error),
            (error) => console.error(error),
            () => { },
        );

        if (this.#ownsTerminal) {
            hasActiveTerminalRenderer = true;
        }
    }

    render(node: ReactNode): void {
        if (this.#isUnmounted) {
            throw new Error("Cannot render using an unmounted Renderer.");
        }

        this.#renderError = null;
        this.#isRendering = true;

        try {
            // Flush synchronously so the terminal reflects the new React tree
            // before render() returns.
            reconciler.updateContainerSync(node, this.#root, null);
            reconciler.flushSyncWork();

            if (this.#renderError !== null) {
                throw this.#renderError;
            }
        } finally {
            this.#isRendering = false;
        }
    }

    unmount(): void {
        if (this.#isUnmounted) {
            return;
        }

        try {
            this.render(null);
        } finally {
            this.#isUnmounted = true;

            if (this.#ownsTerminal) {
                hasActiveTerminalRenderer = false;
            }
        }
    }

    #handleUncaughtError(error: Error): void {
        if (this.#isRendering) {
            this.#renderError = error;
            return;
        }

        // Errors raised outside render() cannot be returned to its caller.
        queueMicrotask(() => {
            throw error;
        });
    }
}
