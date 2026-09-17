import type { ViewStyle } from "../styles.js";
import { createGrid, overlayGrid } from "./grid.js";
import {
    normalizeCellCount,
    resolvePosition,
    resolveSpacing,
} from "./style.js";
import type {
    LayoutChild,
    LayoutConstraints,
    LayoutResult,
    ViewLayoutInput,
} from "./types.js";

type LaidOutChild = {
    readonly child: LayoutChild;
    readonly result: LayoutResult;
};

type Direction = "row" | "column";

type Distribution = {
    readonly leading: number;
    readonly gaps: readonly number[];
};

function resolveOwnDimension(
    explicit: number | undefined,
    stretch: number | undefined,
): number | undefined {
    return normalizeCellCount(explicit) ?? normalizeCellCount(stretch);
}

function constrainAutoDimension(
    natural: number,
    maximum: number | undefined,
): number {
    const normalizedMaximum = normalizeCellCount(maximum);
    return normalizedMaximum === undefined
        ? natural
        : Math.min(natural, normalizedMaximum);
}

function layoutChildren(
    children: readonly LayoutChild[],
    maximumWidth?: number,
): LaidOutChild[] {
    return children.map((child) => ({
        child,
        result: child.layout(
            maximumWidth === undefined ? undefined : { maxWidth: maximumWidth },
        ),
    }));
}

function isInFlow(child: LaidOutChild): boolean {
    return child.result.position.mode !== "absolute";
}

function outerWidth(result: LayoutResult): number {
    return result.margin.left + result.grid.width + result.margin.right;
}

function outerHeight(result: LayoutResult): number {
    return result.margin.top + result.grid.height + result.margin.bottom;
}

function getNaturalBlockWidth(children: readonly LaidOutChild[]): number {
    return children.reduce((width, child) => (
        isInFlow(child) ? Math.max(width, outerWidth(child.result)) : width
    ), 0);
}

function getNaturalBlockHeight(children: readonly LaidOutChild[]): number {
    return children.reduce((height, child) => (
        isInFlow(child) ? height + outerHeight(child.result) : height
    ), 0);
}

function getNaturalFlexSize(
    children: readonly LaidOutChild[],
    direction: Direction,
): { width: number; height: number } {
    const inFlow = children.filter(isInFlow);

    if (direction === "row") {
        return {
            width: inFlow.reduce(
                (width, child) => width + outerWidth(child.result),
                0,
            ),
            height: inFlow.reduce(
                (height, child) => Math.max(height, outerHeight(child.result)),
                0,
            ),
        };
    }

    return {
        width: inFlow.reduce(
            (width, child) => Math.max(width, outerWidth(child.result)),
            0,
        ),
        height: inFlow.reduce(
            (height, child) => height + outerHeight(child.result),
            0,
        ),
    };
}

function paintBlockChildren(
    children: readonly LaidOutChild[],
    width: number,
    height: number,
) {
    const grid = createGrid(width, height);
    let y = 0;

    for (const child of children) {
        if (!isInFlow(child)) {
            continue;
        }

        const { result } = child;
        y += result.margin.top;
        overlayGrid(grid, result.grid, result.margin.left, y);
        y += result.grid.height + result.margin.bottom;
    }

    return grid;
}

function distribute(
    freeSpace: number,
    itemCount: number,
    mode: ViewStyle["justifyContent"],
): Distribution {
    const space = Math.max(0, freeSpace);

    switch (mode ?? "flex-start") {
        case "center":
            return { leading: Math.floor(space / 2), gaps: [] };
        case "flex-end":
            return { leading: space, gaps: [] };
        case "space-between": {
            if (itemCount <= 1) {
                return { leading: 0, gaps: [] };
            }

            const gapCount = itemCount - 1;
            const base = Math.floor(space / gapCount);
            const remainder = space % gapCount;

            return {
                leading: 0,
                gaps: Array.from(
                    { length: gapCount },
                    (_, index) => base + (index < remainder ? 1 : 0),
                ),
            };
        }
        case "space-evenly": {
            const slotCount = itemCount + 1;
            const base = Math.floor(space / slotCount);
            const remainder = space % slotCount;
            const slots = Array.from(
                { length: slotCount },
                (_, index) => base + (index < remainder ? 1 : 0),
            );

            return {
                leading: slots[0] ?? 0,
                gaps: slots.slice(1, itemCount),
            };
        }
        case "flex-start":
            return { leading: 0, gaps: [] };
    }
}

function stretchFlexChildren(
    children: readonly LaidOutChild[],
    direction: Direction,
    crossSize: number,
    alignItems: ViewStyle["alignItems"],
): LaidOutChild[] {
    if (alignItems !== "stretch") {
        return [...children];
    }

    return children.map((child) => {
        if (!isInFlow(child)) {
            return child;
        }

        const { result } = child;

        if (direction === "row" && result.autoHeight) {
            return {
                child: child.child,
                result: child.child.layout({
                    stretchHeight: Math.max(
                        0,
                        crossSize - result.margin.top - result.margin.bottom,
                    ),
                }),
            };
        }

        if (direction === "column" && result.autoWidth) {
            return {
                child: child.child,
                result: child.child.layout({
                    stretchWidth: Math.max(
                        0,
                        crossSize - result.margin.left - result.margin.right,
                    ),
                }),
            };
        }

        return child;
    });
}

function crossOffset(
    result: LayoutResult,
    direction: Direction,
    crossSize: number,
    alignItems: ViewStyle["alignItems"],
): number {
    const before = direction === "row"
        ? result.margin.top
        : result.margin.left;
    const after = direction === "row"
        ? result.margin.bottom
        : result.margin.right;
    const size = direction === "row"
        ? result.grid.height
        : result.grid.width;
    const freeSpace = Math.max(0, crossSize - before - size - after);

    switch (alignItems ?? "stretch") {
        case "center":
            return before + Math.floor(freeSpace / 2);
        case "flex-end":
            return before + freeSpace;
        case "stretch":
        case "flex-start":
            return before;
    }
}

function paintFlexChildren(
    children: readonly LaidOutChild[],
    width: number,
    height: number,
    direction: Direction,
    justifyContent: ViewStyle["justifyContent"],
    alignItems: ViewStyle["alignItems"],
) {
    const grid = createGrid(width, height);
    const inFlow = children.filter(isInFlow);
    const mainSize = direction === "row" ? width : height;
    const usedMainSize = inFlow.reduce((size, { result }) => (
        size + (direction === "row" ? outerWidth(result) : outerHeight(result))
    ), 0);
    const distribution = distribute(
        mainSize - usedMainSize,
        inFlow.length,
        justifyContent,
    );
    const crossSize = direction === "row" ? height : width;
    let mainPosition = distribution.leading;

    inFlow.forEach(({ result }, index) => {
        const mainBefore = direction === "row"
            ? result.margin.left
            : result.margin.top;
        const mainAfter = direction === "row"
            ? result.margin.right
            : result.margin.bottom;
        const childMainSize = direction === "row"
            ? result.grid.width
            : result.grid.height;
        const childCrossPosition = crossOffset(
            result,
            direction,
            crossSize,
            alignItems,
        );

        mainPosition += mainBefore;
        overlayGrid(
            grid,
            result.grid,
            direction === "row" ? mainPosition : childCrossPosition,
            direction === "row" ? childCrossPosition : mainPosition,
        );
        mainPosition += childMainSize + mainAfter;
        mainPosition += distribution.gaps[index] ?? 0;
    });

    return grid;
}

function addPadding(
    content: ReturnType<typeof createGrid>,
    style: Readonly<ViewStyle>,
) {
    const padding = resolveSpacing(style, "padding");
    const grid = createGrid(
        padding.left + content.width + padding.right,
        padding.top + content.height + padding.bottom,
    );

    overlayGrid(grid, content, padding.left, padding.top);
    return grid;
}

export function layoutView(
    input: ViewLayoutInput,
    constraints: LayoutConstraints = {},
): LayoutResult {
    const { style } = input;
    const isFlex = style.display === "flex";
    const direction = style.flexDirection ?? "row";
    const explicitWidth = normalizeCellCount(style.width);
    const explicitHeight = normalizeCellCount(style.height);
    const fixedWidth = resolveOwnDimension(
        explicitWidth,
        constraints.stretchWidth,
    );
    const fixedHeight = resolveOwnDimension(
        explicitHeight,
        constraints.stretchHeight,
    );
    const initialChildren = layoutChildren(
        input.children,
        isFlex ? undefined : fixedWidth ?? normalizeCellCount(constraints.maxWidth),
    );
    const naturalSize = isFlex
        ? getNaturalFlexSize(initialChildren, direction)
        : {
            width: getNaturalBlockWidth(initialChildren),
            height: getNaturalBlockHeight(initialChildren),
        };
    const width = fixedWidth ?? constrainAutoDimension(
        naturalSize.width,
        constraints.maxWidth,
    );
    const height = fixedHeight ?? constrainAutoDimension(
        naturalSize.height,
        constraints.maxHeight,
    );
    const children = isFlex
        ? stretchFlexChildren(
            initialChildren,
            direction,
            direction === "row" ? height : width,
            style.alignItems ?? "stretch",
        )
        : initialChildren;
    const content = isFlex
        ? paintFlexChildren(
            children,
            width,
            height,
            direction,
            style.justifyContent,
            style.alignItems ?? "stretch",
        )
        : paintBlockChildren(children, width, height);

    return {
        grid: addPadding(content, style),
        margin: resolveSpacing(style, "margin"),
        position: resolvePosition(style),
        autoWidth: explicitWidth === undefined &&
            constraints.stretchWidth === undefined,
        autoHeight: explicitHeight === undefined &&
            constraints.stretchHeight === undefined,
    };
}
