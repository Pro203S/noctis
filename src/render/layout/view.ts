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
    contentWidth: number | undefined,
    maximumWidth: number | undefined,
): LaidOutChild[] {
    const childMaximumWidth = contentWidth ?? normalizeCellCount(maximumWidth);

    return children.map((child) => ({
        child,
        result: child.layout(
            childMaximumWidth === undefined
                ? undefined
                : { maxWidth: childMaximumWidth },
        ),
    }));
}

function getNaturalBlockWidth(children: readonly LaidOutChild[]): number {
    return children.reduce((width, { result }) => Math.max(
        width,
        result.margin.left + result.grid.width + result.margin.right,
    ), 0);
}

function getNaturalBlockHeight(children: readonly LaidOutChild[]): number {
    return children.reduce((height, { result }) => (
        result.position.mode === "absolute"
            ? height
            : height + result.margin.top + result.grid.height + result.margin.bottom
    ), 0);
}

function paintBlockChildren(
    children: readonly LaidOutChild[],
    width: number,
    height: number,
) {
    const grid = createGrid(width, height);
    let y = 0;

    for (const { result } of children) {
        if (result.position.mode === "absolute") {
            continue;
        }

        y += result.margin.top;
        overlayGrid(grid, result.grid, result.margin.left, y);
        y += result.grid.height + result.margin.bottom;
    }

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
    const explicitWidth = normalizeCellCount(style.width);
    const explicitHeight = normalizeCellCount(style.height);
    const contentWidth = resolveOwnDimension(
        explicitWidth,
        constraints.stretchWidth,
    );
    const contentHeight = resolveOwnDimension(
        explicitHeight,
        constraints.stretchHeight,
    );
    const children = layoutChildren(
        input.children,
        contentWidth,
        constraints.maxWidth,
    );
    const naturalWidth = getNaturalBlockWidth(children);
    const naturalHeight = getNaturalBlockHeight(children);
    const resolvedWidth = contentWidth ?? constrainAutoDimension(
        naturalWidth,
        constraints.maxWidth,
    );
    const resolvedHeight = contentHeight ?? constrainAutoDimension(
        naturalHeight,
        constraints.maxHeight,
    );
    const content = paintBlockChildren(
        children,
        resolvedWidth,
        resolvedHeight,
    );

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
