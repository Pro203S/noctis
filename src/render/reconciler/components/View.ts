import { COMPONENT_NAME, type ViewProps } from "../../../components/View.js";
import type {
    HostComponent,
    HostProps,
    NoctisChild,
} from "../index.js";

export type NoctisView = {
    readonly kind: "component";
    readonly type: typeof COMPONENT_NAME;
    readonly component: HostComponent<Readonly<ViewProps>>;
    props: Readonly<ViewProps>;
    readonly children: NoctisChild[];
    hidden: boolean;
};

export function createView(props: HostProps): NoctisView {
    return {
        "kind": "component",
        "type": COMPONENT_NAME,
        "component": view,
        "props": props as Readonly<ViewProps>,
        "children": [],
        "hidden": false,
    };
}

const view: HostComponent<Readonly<ViewProps>> = {
    type: COMPONENT_NAME,

    render(props, children) {
        const height = props.style?.height;

        if (height === undefined) {
            return children;
        }

        const lines = children === "" ? [] : children.split("\n");

        return Array.from(
            { length: height },
            (_, index) => lines[index] ?? "",
        ).join("\n");
    },
};

export default view;
