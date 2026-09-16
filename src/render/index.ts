import type { ReactNode } from "react";
import {
    createRoot,
    updateRoot,
    type ReconcilerRoot,
    type RootContainer,
} from "./reconciler/index.js";

let hasActiveTerminalRenderer = false;

/**
 * `process.stdout`의 현재 커서 영역을 소유하는 터미널 렌더러입니다.
 * TTY에서는 출력 충돌을 막기 위해 한 번에 하나의 인스턴스만 사용할 수 있습니다.
 * 마운트된 동안에는 `console.log`를 포함한 다른 stdout 출력을 함께 사용하지 마세요.
 */
export default class Renderer {
    readonly #container: RootContainer;
    readonly #root: ReconcilerRoot;
    #unmounted = false;

    constructor() {
        if (process.stdout.isTTY === true && hasActiveTerminalRenderer) {
            throw new Error("TTY에서는 Renderer를 한 번에 하나만 사용할 수 있습니다.");
        }

        this.#container = {
            children: [],
            renderedText: "",
            renderError: null,
            isRendering: false,
        };
        this.#root = createRoot(this.#container);

        if (process.stdout.isTTY === true) {
            hasActiveTerminalRenderer = true;
        }
    }

    render(node: ReactNode): void {
        if (this.#unmounted) {
            throw new Error("unmount된 Renderer는 다시 렌더링할 수 없습니다.");
        }

        this.#container.renderError = null;
        this.#container.isRendering = true;

        try {
            updateRoot(this.#root, node);

            if (this.#container.renderError !== null) {
                throw this.#container.renderError;
            }
        } finally {
            this.#container.isRendering = false;
        }
    }

    unmount(): void {
        if (this.#unmounted) {
            return;
        }

        try {
            this.render(null);
        } finally {
            this.#unmounted = true;

            if (process.stdout.isTTY === true) {
                hasActiveTerminalRenderer = false;
            }
        }
    }
}
