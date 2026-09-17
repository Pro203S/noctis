type TerminalOutput = Pick<NodeJS.WriteStream, "isTTY" | "rows" | "write">;
type ProcessLifecycle = Pick<
    NodeJS.Process,
    "kill" | "listenerCount" | "off" | "once" | "pid"
>;
type TerminationSignal = "SIGINT" | "SIGTERM";

const INITIALIZE_TERMINAL = "\u001B[2J\u001B[H\u001B[?25l";
const RESTORE_TERMINAL = "\u001B[?25h";

export default class CliManager {
    readonly #lifecycle: ProcessLifecycle;
    readonly #output: TerminalOutput;

    #isInitialized = false;

    readonly #handleExit = (): void => {
        this.restore();
    };

    readonly #handleSigint = (): void => {
        this.#handleSignal("SIGINT");
    };

    readonly #handleSigterm = (): void => {
        this.#handleSignal("SIGTERM");
    };

    constructor(
        output: TerminalOutput = process.stdout,
        lifecycle: ProcessLifecycle = process,
    ) {
        this.#output = output;
        this.#lifecycle = lifecycle;
    }

    get isTerminal(): boolean {
        return this.#output.isTTY === true;
    }

    initialize(): void {
        if (!this.isTerminal || this.#isInitialized) {
            return;
        }

        const height = Math.max(0, this.#output.rows ?? 0);

        this.#output.write(`${INITIALIZE_TERMINAL}${"\n".repeat(Math.max(0, height - 1))}\u001B[H`);

        this.#output.write("\x1b[?1003h"); // 마우스 tracking
        this.#output.write("\x1b[?1006h"); // SGR 좌표 인코딩

        this.#isInitialized = true;
        this.#registerExitHandlers();
    }

    restore(): void {
        if (!this.#isInitialized) {
            return;
        }

        this.#removeExitHandlers();
        this.#output.write(RESTORE_TERMINAL);

        this.#output.write("\x1b[?1003l");
        this.#output.write("\x1b[?1006l");

        this.#isInitialized = false;
    }

    #handleSignal(signal: TerminationSignal): void {
        this.restore();

        if (this.#lifecycle.listenerCount(signal) === 0) {
            this.#lifecycle.kill(this.#lifecycle.pid, signal);
        }
    }

    #registerExitHandlers(): void {
        this.#lifecycle.once("exit", this.#handleExit);
        this.#lifecycle.once("SIGINT", this.#handleSigint);
        this.#lifecycle.once("SIGTERM", this.#handleSigterm);
    }

    #removeExitHandlers(): void {
        this.#lifecycle.off("exit", this.#handleExit);
        this.#lifecycle.off("SIGINT", this.#handleSigint);
        this.#lifecycle.off("SIGTERM", this.#handleSigterm);
    }
}
