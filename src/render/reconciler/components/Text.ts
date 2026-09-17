import { COMPONENT_NAME, type TextProps } from "../../../components/Text.js";
import type {
    HostComponent,
    HostProps,
    NoctisChild,
} from "../index.js";

export type NoctisText = {
    readonly kind: "component";
    readonly type: typeof COMPONENT_NAME;
    readonly component: HostComponent<Readonly<TextProps>>;
    props: Readonly<TextProps>;
    readonly children: NoctisChild[];
    hidden: boolean;
};

function getTextProps(props: HostProps): Readonly<TextProps> {
    return props as Readonly<TextProps>;
}

export function createText(props: HostProps): NoctisText {
    return {
        "kind": "component",
        "type": COMPONENT_NAME,
        "component": text,
        "props": getTextProps(props),
        "children": [],
        "hidden": false,
    };
}

const text: HostComponent<Readonly<TextProps>> = {
    type: COMPONENT_NAME,

    render(_props, children) {
        return children;
    },
};

export default text;
