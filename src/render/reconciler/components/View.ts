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

    render(_props, children) {
        return children;
    },
};

export default view;
