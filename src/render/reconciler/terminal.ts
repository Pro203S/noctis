import { serializeContainer } from "./tree.js";
import type { RootContainer } from "./types.js";

export function redraw(container: RootContainer): void {
    const nextText = serializeContainer(container);

    if (nextText === container.renderedText) {
        return;
    }

    if (process.stdout.isTTY !== true) {
        if (nextText.length > 0) {
            process.stdout.write(nextText);
        }

        container.renderedText = nextText;
        return;
    }

    if (container.renderedText.length > 0) {
        const previousLineCount = container.renderedText.split("\n").length;
        const moveToStart = previousLineCount > 1
            ? `\r\u001B[${previousLineCount - 1}A`
            : "\r";

        process.stdout.write(`${moveToStart}\u001B[0J`);
    }

    if (nextText.length > 0) {
        process.stdout.write(nextText);
    }

    container.renderedText = nextText;
}
