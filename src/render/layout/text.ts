import ansiRegex from "ansi-regex";
import stringWidth from "string-width";
import { createGrid, placeGlyph } from "./grid.js";
import type { CellGrid } from "./types.js";

const graphemes = new Intl.Segmenter(undefined, {
    granularity: "grapheme",
});

type TextToken =
    | { kind: "ansi"; value: string }
    | { kind: "grapheme"; value: string };

type Glyph = {
    segment: string;
    width: 1 | 2;
    prefix: string;
    suffix: string;
};

function appendGraphemes(tokens: TextToken[], value: string): void {
    for (const { segment } of graphemes.segment(value)) {
        tokens.push({ kind: "grapheme", value: segment });
    }
}

function tokenize(text: string): TextToken[] {
    const tokens: TextToken[] = [];
    const pattern = ansiRegex();
    let textIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        appendGraphemes(tokens, text.slice(textIndex, match.index));
        tokens.push({ kind: "ansi", value: match[0] });
        textIndex = match.index + match[0].length;
    }

    appendGraphemes(tokens, text.slice(textIndex));
    return tokens;
}

function attachSuffix(rows: Glyph[][], suffix: string): void {
    for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
        const row = rows[rowIndex];
        const glyph = row[row.length - 1];

        if (glyph !== undefined) {
            glyph.suffix += suffix;
            return;
        }
    }
}

export function textToGrid(text: string, maxWidth?: number): CellGrid {
    if (text === "") {
        return createGrid(0, 0);
    }

    const limit = maxWidth === undefined
        ? undefined
        : Math.max(0, Math.floor(maxWidth));
    const rows: Glyph[][] = [[]];
    const widths = [0];
    let pendingAnsi = "";

    for (const token of tokenize(text)) {
        if (token.kind === "ansi") {
            pendingAnsi += token.value;
            continue;
        }

        const segment = token.value;

        if (segment === "\n") {
            rows.push([]);
            widths.push(0);
            continue;
        }

        const measuredWidth = Math.min(2, stringWidth(segment));

        if (measuredWidth === 0) {
            const row = rows[rows.length - 1];
            const glyph = row[row.length - 1];

            if (glyph !== undefined) {
                glyph.segment += segment;
            }

            continue;
        }

        const glyphWidth = measuredWidth as 1 | 2;
        let rowIndex = rows.length - 1;

        if (
            limit !== undefined &&
            widths[rowIndex] > 0 &&
            widths[rowIndex] + glyphWidth > limit
        ) {
            rows.push([]);
            widths.push(0);
            rowIndex += 1;
        }

        if (limit === 0 || (limit !== undefined && glyphWidth > limit)) {
            continue;
        }

        rows[rowIndex].push({
            segment,
            width: glyphWidth,
            prefix: pendingAnsi,
            suffix: "",
        });
        pendingAnsi = "";
        widths[rowIndex] += glyphWidth;
    }

    attachSuffix(rows, pendingAnsi);

    const width = limit ?? Math.max(0, ...widths);
    const grid = createGrid(width, rows.length);

    rows.forEach((row, y) => {
        let x = 0;

        for (const glyph of row) {
            placeGlyph(
                grid,
                x,
                y,
                glyph.segment,
                glyph.width,
                glyph.prefix,
                glyph.suffix,
            );
            x += glyph.width;
        }
    });

    return grid;
}
