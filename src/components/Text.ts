import React, { type ReactNode } from "react";
import type { TextStyle } from "../render/styles.js";

export const COMPONENT_NAME = "noctis-text" as const;

export type TextProps = {
    style?: TextStyle;
    children?: ReactNode;
};

export default function Text(props: TextProps) {
    return React.createElement(COMPONENT_NAME, props);
}
