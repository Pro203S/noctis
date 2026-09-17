import { COMPONENT_NAME, type ViewProps } from "../../../components/View.js";
import { layoutView } from "../../layout/view.js";
import type {
    LayoutChild,
    LayoutConstraints,
    LayoutResult,
} from "../../layout/types.js";
import type {
    HostComponent,
    HostProps,
    NoctisChild,
} from "../index.js";

export type NoctisView = {
    readonly kind: "component";
    readonly type: typeof COMPONENT_NAME;
    readonly component: HostComponent<
        Readonly<ViewProps>,
        readonly LayoutChild[],
        LayoutResult,
        LayoutConstraints
    >;
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

const view: HostComponent<
    Readonly<ViewProps>,
    readonly LayoutChild[],
    LayoutResult,
    LayoutConstraints
> = {
    type: COMPONENT_NAME,

    render(props, children, constraints) {
        return layoutView(
            {
                style: props.style ?? {},
                children,
            },
            constraints,
        );
    },
};

export default view;
