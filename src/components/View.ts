import React, { type ReactNode } from "react";
import type { ViewStyle } from "../render/styles.js";

export const COMPONENT_NAME = "noctis-view" as const;

export type ViewProps = {
    style?: ViewStyle;
    children?: ReactNode;
};

export default function View(props: ViewProps) {
    return React.createElement(COMPONENT_NAME, props);
}
