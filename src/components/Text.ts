import React, { type ReactNode } from "react";
import type { TextStyle } from "../render/styles.js";
import { TEXT_TYPE } from "../render/reconciler/components/Text.js";

export const COMPONENT_NAME = TEXT_TYPE;

export type TextProps = {
    style?: TextStyle;
    children?: ReactNode;
};

export default function Text(props: TextProps) {
    return React.createElement(COMPONENT_NAME, props);
}
