import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import {
    emitKeypressEvents,
    type Key,
} from "node:readline";

export type PressedKey = {
    name: string;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
};

export type MouseInput = {
    x: number;
    y: number;
    button: "left" | "middle" | "right" | "none" | "wheelUp" | "wheelDown";
    action: "press" | "release" | "move" | "drag" | "scroll";
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
};

type InputManagerEvents = {
    keypress: [key: PressedKey];
    mouse: [mouse: MouseInput];
};

class InputManager extends EventEmitter<InputManagerEvents> {
    readonly #keyboardStream = new PassThrough();

    #buffer = "";
    #initialized = false;

    constructor() {
        super();

        emitKeypressEvents(this.#keyboardStream);

        this.#keyboardStream.on(
            "keypress",
            (str: string | undefined, key: Key) => {
                this.emit("keypress", {
                    name: key.name ?? str ?? "",
                    shift: key.shift ?? false,
                    ctrl: key.ctrl ?? false,
                    alt: key.meta ?? false,
                    meta: false,
                });
            },
        );
    }

    initialize(): void {
        if (this.#initialized) return;

        this.#initialized = true;

        process.stdin.setRawMode?.(true);
        process.stdin.resume();

        process.stdin.on("data", this.#handleData);

        // SGR mouse + 모든 mouse movement
        process.stdout.write(
            "\x1b[?1003h" +
            "\x1b[?1006h",
        );
    }

    restore(): void {
        if (!this.#initialized) return;

        process.stdin.off("data", this.#handleData);

        process.stdout.write(
            "\x1b[?1003l" +
            "\x1b[?1006l",
        );

        process.stdin.setRawMode?.(false);

        this.#buffer = "";
        this.#initialized = false;
    }

    readonly #handleData = (data: Buffer): void => {
        this.#buffer += data.toString("utf8");

        this.#processBuffer();
    };

    #processBuffer(): void {
        while (this.#buffer.length > 0) {
            const mouseStart = this.#buffer.indexOf("\x1b[<");

            // 마우스 시퀀스가 없음
            if (mouseStart === -1) {
                /*
                 * 마지막 부분이 불완전한 mouse sequence의 시작일 수 있음.
                 *
                 * ESC
                 * ESC[
                 */
                const pendingLength = this.#getPendingMousePrefixLength();

                const keyboardLength =
                    this.#buffer.length - pendingLength;

                if (keyboardLength > 0) {
                    this.#writeKeyboard(
                        this.#buffer.slice(0, keyboardLength),
                    );

                    this.#buffer =
                        this.#buffer.slice(keyboardLength);
                }

                return;
            }

            // mouse sequence 앞의 키보드 입력
            if (mouseStart > 0) {
                this.#writeKeyboard(
                    this.#buffer.slice(0, mouseStart),
                );

                this.#buffer = this.#buffer.slice(mouseStart);
                continue;
            }

            /*
             * SGR mouse:
             *
             * ESC [ < Cb ; Cx ; Cy M
             * ESC [ < Cb ; Cx ; Cy m
             */
            const match =
                /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/.exec(
                    this.#buffer,
                );

            if (match) {
                this.#emitMouse(
                    Number(match[1]),
                    Number(match[2]),
                    Number(match[3]),
                    match[4] === "M",
                );

                this.#buffer =
                    this.#buffer.slice(match[0].length);

                continue;
            }

            // 아직 mouse sequence가 전부 도착하지 않음
            if (/^\x1b\[<[0-9;]*$/.test(this.#buffer)) {
                return;
            }

            /*
             * ESC[< 로 시작하지만 올바른 SGR mouse가 아니면
             * keyboard parser에 ESC 하나를 넘기고 다시 분석.
             */
            this.#writeKeyboard(this.#buffer[0]);
            this.#buffer = this.#buffer.slice(1);
        }
    }

    #writeKeyboard(input: string): void {
        if (input.length === 0) return;

        this.#keyboardStream.write(
            Buffer.from(input, "utf8"),
        );
    }

    #getPendingMousePrefixLength(): number {
        if (this.#buffer.endsWith("\x1b[")) {
            return 2;
        }

        if (this.#buffer.endsWith("\x1b")) {
            return 1;
        }

        return 0;
    }

    #emitMouse(
        code: number,
        x: number,
        y: number,
        pressed: boolean,
    ): void {
        const shift = (code & 4) !== 0;
        const alt = (code & 8) !== 0;
        const ctrl = (code & 16) !== 0;

        const motion = (code & 32) !== 0;
        const wheel = (code & 64) !== 0;

        const buttonCode = code & 3;

        let button: MouseInput["button"];
        let action: MouseInput["action"];

        if (wheel) {
            button = buttonCode === 0
                ? "wheelUp"
                : "wheelDown";

            action = "scroll";
        } else {
            switch (buttonCode) {
                case 0:
                    button = "left";
                    break;

                case 1:
                    button = "middle";
                    break;

                case 2:
                    button = "right";
                    break;

                default:
                    button = "none";
                    break;
            }

            if (motion) {
                action = button === "none"
                    ? "move"
                    : "drag";
            } else {
                action = pressed
                    ? "press"
                    : "release";
            }
        }

        this.emit("mouse", {
            x,
            y,
            button,
            action,
            shift,
            ctrl,
            alt,
        });
    }
}

const inputManager = new InputManager();

export default inputManager;