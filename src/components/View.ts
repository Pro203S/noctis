import React, { type ReactNode, type Ref } from "react";
import type { ViewStyle } from "../render/styles.js";

export const COMPONENT_NAME = "noctis-view" as const;

export type ViewRef = {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
};

export type ViewProps = {
    style?: ViewStyle;
    children?: ReactNode;
    ref?: Ref<ViewRef>;
};

export default function View(props: ViewProps) {
    return React.createElement(COMPONENT_NAME, props);
}
