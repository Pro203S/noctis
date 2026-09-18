import { COMPONENT_NAME, type TextProps, type TextRef } from "../../../components/Text.js";
import type {
    HostComponent,
    HostProps,
    NoctUIChild,
} from "../index.js";

export type NoctUIText = {
    readonly kind: "component";
    readonly type: typeof COMPONENT_NAME;
    readonly component: HostComponent<Readonly<TextProps>>;
    props: Readonly<TextProps>;
    readonly children: NoctUIChild[];
    hidden: boolean;
    readonly publicInstance: TextRef;
};

function getTextContent(children: readonly NoctUIChild[]): string {
    return children.map((child) => {
        if (child.hidden) return "";
        if (child.kind === "text") return child.text;
        if (child.type === COMPONENT_NAME) return getTextContent(child.children);
        return "";
    }).join("");
}

export function createText(props: HostProps): NoctUIText {
    let instance: NoctUIText;

    instance = {
        "kind": "component",
        "type": COMPONENT_NAME,
        "component": text,
        "props": props as Readonly<TextProps>,
        "children": [],
        "hidden": false,
        "publicInstance": {
            get content() {
                return getTextContent(instance.children);
            },
            set content(value: string) {
                instance.children.length = 0;
                instance.children.push({
                    "kind": "text",
                    "text": value,
                    "hidden": false,
                });
            },
        },
    };

    return instance;
}

const text: HostComponent<Readonly<TextProps>> = {
    type: COMPONENT_NAME,

    render(props, children) {
        const { style } = props;
        if (!style) return children;

        let result = children;

        if (style.color) {
            
        }

        return result;
    },
};

export default text;
