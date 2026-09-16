import React, { type ReactNode } from "react";
import type { ViewStyle } from "../render/styles.js";
import { VIEW_TYPE } from "../render/reconciler/components/view.js";

export const COMPONENT_NAME = VIEW_TYPE;

export type ViewProps = {
    style?: ViewStyle;
    children?: ReactNode;
};

export default function View(props: ViewProps) {
    return React.createElement(COMPONENT_NAME, props);
}
