import type { ViewStyle } from "../styles.js";
import type { Edges, LayoutPosition } from "./types.js";

export const ZERO_EDGES: Readonly<Edges> = Object.freeze({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
});

export function normalizeCellCount(
    value: unknown,
    allowNegative = false,
): number | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return undefined;
    }

    const integer = Math.floor(value);
    return allowNegative ? integer : Math.max(0, integer);
}

export function resolveSpacing(
    style: Readonly<ViewStyle>,
    kind: "margin" | "padding",
): Edges {
    if (kind === "margin") {
        const all = normalizeCellCount(style.margin) ?? 0;
        const horizontal = normalizeCellCount(style.marginHorizontal) ?? all;
        const vertical = normalizeCellCount(style.marginVertical) ?? all;

        return {
            top: normalizeCellCount(style.marginTop) ?? vertical,
            right: normalizeCellCount(style.marginRight) ?? horizontal,
            bottom: normalizeCellCount(style.marginBottom) ?? vertical,
            left: normalizeCellCount(style.marginLeft) ?? horizontal,
        };
    }

    const all = normalizeCellCount(style.padding) ?? 0;
    const horizontal = normalizeCellCount(style.paddingHorizontal) ?? all;
    const vertical = normalizeCellCount(style.paddingVertical) ?? all;

    return {
        top: normalizeCellCount(style.paddingTop) ?? vertical,
        right: normalizeCellCount(style.paddingRight) ?? horizontal,
        bottom: normalizeCellCount(style.paddingBottom) ?? vertical,
        left: normalizeCellCount(style.paddingLeft) ?? horizontal,
    };
}

export function resolvePosition(
    style: Readonly<ViewStyle>,
): LayoutPosition {
    const mode = style.position ?? "static";
    const zIndex = normalizeCellCount(style.zIndex, true) ?? 0;

    if (mode === "static") {
        return { mode, zIndex };
    }

    const top = normalizeCellCount(style.top, true);
    const right = normalizeCellCount(style.right, true);
    const bottom = normalizeCellCount(style.bottom, true);
    const left = normalizeCellCount(style.left, true);

    return {
        mode,
        zIndex,
        ...(top === undefined ? {} : { top }),
        ...(right === undefined ? {} : { right }),
        ...(bottom === undefined ? {} : { bottom }),
        ...(left === undefined ? {} : { left }),
    };
}
