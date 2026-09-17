import type { Cell, CellGrid, ResolvedColor } from "./types.js";

function normalizeDimension(value: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function createCell(): Cell {
    return {
        character: " ",
        span: 1,
        transparent: true,
        ansiPrefix: "",
        ansiSuffix: "",
    };
}

function cloneCell(cell: Cell): Cell {
    return { ...cell };
}

export function createGrid(width: number, height: number): CellGrid {
    const normalizedWidth = normalizeDimension(width);
    const normalizedHeight = normalizeDimension(height);

    return {
        width: normalizedWidth,
        height: normalizedHeight,
        cells: Array.from(
            { length: normalizedHeight },
            () => Array.from({ length: normalizedWidth }, createCell),
        ),
    };
}

function clearGlyph(grid: CellGrid, x: number, y: number): void {
    if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) {
        return;
    }

    let start = x;
    if (grid.cells[y][start].span === 0) {
        start -= 1;
    }

    if (start < 0) {
        return;
    }

    const span = grid.cells[y][start].span;
    grid.cells[y][start] = createCell();

    if (span === 2 && start + 1 < grid.width) {
        grid.cells[y][start + 1] = createCell();
    }
}

export function placeGlyph(
    grid: CellGrid,
    x: number,
    y: number,
    character: string,
    span: 1 | 2,
    ansiPrefix = "",
    ansiSuffix = "",
    foreground?: ResolvedColor,
    background?: ResolvedColor,
): boolean {
    if (
        x < 0 ||
        y < 0 ||
        y >= grid.height ||
        x + span > grid.width
    ) {
        return false;
    }

    clearGlyph(grid, x, y);
    if (span === 2) {
        clearGlyph(grid, x + 1, y);
    }

    grid.cells[y][x] = {
        character,
        span,
        transparent: false,
        ansiPrefix,
        ansiSuffix,
        ...(foreground === undefined ? {} : { foreground }),
        ...(background === undefined ? {} : { background }),
    };

    if (span === 2) {
        grid.cells[y][x + 1] = {
            character: "",
            span: 0,
            transparent: false,
            ansiPrefix: "",
            ansiSuffix: "",
            ...(foreground === undefined ? {} : { foreground }),
            ...(background === undefined ? {} : { background }),
        };
    }

    return true;
}

export function overlayGrid(
    target: CellGrid,
    source: CellGrid,
    offsetX: number,
    offsetY: number,
): void {
    for (let sourceY = 0; sourceY < source.height; sourceY += 1) {
        for (let sourceX = 0; sourceX < source.width; sourceX += 1) {
            const sourceCell = source.cells[sourceY][sourceX];

            if (sourceCell.transparent || sourceCell.span === 0) {
                continue;
            }

            placeGlyph(
                target,
                offsetX + sourceX,
                offsetY + sourceY,
                sourceCell.character,
                sourceCell.span,
                sourceCell.ansiPrefix,
                sourceCell.ansiSuffix,
                sourceCell.foreground,
                sourceCell.background,
            );
        }
    }
}

export function cropGrid(
    grid: CellGrid,
    width: number,
    height: number,
): CellGrid {
    const cropped = createGrid(width, height);
    overlayGrid(cropped, grid, 0, 0);
    return cropped;
}

export function resizeGrid(
    grid: CellGrid,
    width: number,
    height: number,
): CellGrid {
    return cropGrid(grid, width, height);
}

export function gridToPlainText(grid: CellGrid): string {
    return grid.cells.map((row) => {
        let output = "";

        for (const cell of row) {
            if (cell.span === 0) {
                continue;
            }

            output += `${cell.ansiPrefix}${cell.character}${cell.ansiSuffix}`;
        }

        return output;
    }).join("\n");
}

export function copyGrid(grid: CellGrid): CellGrid {
    return {
        width: grid.width,
        height: grid.height,
        cells: grid.cells.map((row) => row.map(cloneCell)),
    };
}
