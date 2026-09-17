import type { ViewStyle } from "../styles.js";

export type ResolvedColor = readonly [
    red: number,
    green: number,
    blue: number,
];

export type Cell = {
    character: string;
    span: 0 | 1 | 2;
    transparent: boolean;
    ansiPrefix: string;
    ansiSuffix: string;
    foreground?: ResolvedColor;
    background?: ResolvedColor;
};

export type CellGrid = {
    readonly width: number;
    readonly height: number;
    readonly cells: Cell[][];
};

export type Edges = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type LayoutConstraints = {
    maxWidth?: number;
    maxHeight?: number;
    stretchWidth?: number;
    stretchHeight?: number;
};

export type LayoutPosition = {
    mode: "static" | "relative" | "absolute";
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    zIndex: number;
};

export type LayoutResult = {
    readonly grid: CellGrid;
    readonly margin: Edges;
    readonly position: LayoutPosition;
    readonly autoWidth: boolean;
    readonly autoHeight: boolean;
};

export type LayoutChild = {
    readonly sourceIndex: number;
    readonly layout: (constraints?: LayoutConstraints) => LayoutResult;
};

export type ViewLayoutInput = {
    readonly style: Readonly<ViewStyle>;
    readonly children: readonly LayoutChild[];
};
