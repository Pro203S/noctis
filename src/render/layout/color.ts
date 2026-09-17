import chalk from "chalk";
import { isHexColor } from "../styles.js";
import type { Cell, CellGrid, ResolvedColor } from "./types.js";

const NAMED_COLORS = {
    black: [0, 0, 0],
    red: [205, 49, 49],
    green: [13, 188, 121],
    yellow: [229, 229, 16],
    blue: [36, 114, 200],
    magenta: [188, 63, 188],
    cyan: [17, 168, 205],
    white: [229, 229, 229],
    brightBlack: [102, 102, 102],
    brightRed: [241, 76, 76],
    brightGreen: [35, 209, 139],
    brightYellow: [245, 245, 67],
    brightBlue: [59, 142, 234],
    brightMagenta: [214, 112, 214],
    brightCyan: [41, 184, 219],
    brightWhite: [255, 255, 255],
} as const satisfies Record<string, ResolvedColor>;

export type BackgroundPaint =
    | Readonly<{
        type: "solid";
        color: ResolvedColor;
    }>
    | Readonly<{
        type: "gradient";
        start: ResolvedColor;
        end: ResolvedColor;
        rotation: number;
    }>;

function expandHex(value: string): string {
    return value.length === 4
        ? `${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
        : value.slice(1);
}

export function resolveColor(value: unknown): ResolvedColor | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    if (value in NAMED_COLORS) {
        return NAMED_COLORS[value as keyof typeof NAMED_COLORS];
    }

    if (!isHexColor(value)) {
        return undefined;
    }

    const hex = expandHex(value);
    return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
    ];
}

function clampRatio(value: number): number {
    return Math.min(1, Math.max(0, value));
}

export function interpolateColor(
    start: ResolvedColor,
    end: ResolvedColor,
    ratio: number,
): ResolvedColor {
    const amount = clampRatio(ratio);

    return [
        Math.round(start[0] + (end[0] - start[0]) * amount),
        Math.round(start[1] + (end[1] - start[1]) * amount),
        Math.round(start[2] + (end[2] - start[2]) * amount),
    ];
}

function normalizeRotation(rotation: number): number {
    if (!Number.isFinite(rotation)) {
        return 0;
    }

    return ((rotation % 360) + 360) % 360;
}

function paintCell(cell: Cell, color: ResolvedColor): void {
    if (cell.background === undefined) {
        cell.background = color;
    }

    cell.transparent = false;
}

export function paintBackground(
    grid: CellGrid,
    paint: BackgroundPaint,
): void {
    if (grid.width === 0 || grid.height === 0) {
        return;
    }

    if (paint.type === "solid") {
        for (const row of grid.cells) {
            for (const cell of row) {
                paintCell(cell, paint.color);
            }
        }
        return;
    }

    const radians = normalizeRotation(paint.rotation) * Math.PI / 180;
    const dx = Math.sin(radians);
    const dy = -Math.cos(radians);
    const halfWidth = (grid.width - 1) / 2;
    const halfHeight = (grid.height - 1) / 2;
    const projections = [
        -halfWidth * dx - halfHeight * dy,
        halfWidth * dx - halfHeight * dy,
        halfWidth * dx + halfHeight * dy,
        -halfWidth * dx + halfHeight * dy,
    ];
    const minimum = Math.min(...projections);
    const maximum = Math.max(...projections);
    const distance = maximum - minimum;

    for (let y = 0; y < grid.height; y += 1) {
        for (let x = 0; x < grid.width; x += 1) {
            const projection = (x - halfWidth) * dx + (y - halfHeight) * dy;
            const ratio = distance === 0 ? 0 : (projection - minimum) / distance;
            paintCell(
                grid.cells[y][x],
                interpolateColor(paint.start, paint.end, ratio),
            );
        }
    }
}

function colorSequence(cell: Cell, colorLevel: number): string {
    if (colorLevel === 0) {
        return "";
    }

    const parameters: string[] = [];

    if (cell.foreground !== undefined) {
        parameters.push(`38;2;${cell.foreground.join(";")}`);
    }

    if (cell.background !== undefined) {
        parameters.push(`48;2;${cell.background.join(";")}`);
    }

    return parameters.length === 0
        ? ""
        : `\u001B[${parameters.join(";")}m`;
}

export function serializeGrid(
    grid: CellGrid,
    colorLevel: 0 | 1 | 2 | 3 = chalk.level,
): string {
    const rows: string[] = [];

    for (const row of grid.cells) {
        let output = "";
        let activeStyle: string | null = "";

        for (const cell of row) {
            if (cell.span === 0) {
                continue;
            }

            const nextStyle = colorSequence(cell, colorLevel);

            if (nextStyle !== activeStyle) {
                if (activeStyle !== "") {
                    output += "\u001B[0m";
                }

                output += nextStyle;
                activeStyle = nextStyle;
            }

            output += `${cell.ansiPrefix}${cell.character}${cell.ansiSuffix}`;

            if (cell.ansiPrefix !== "" || cell.ansiSuffix !== "") {
                activeStyle = null;
            }
        }

        if (activeStyle !== "") {
            output += "\u001B[0m";
        }

        rows.push(output);
    }

    return rows.join("\n");
}
