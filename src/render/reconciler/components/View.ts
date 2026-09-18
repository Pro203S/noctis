import { COMPONENT_NAME, type ViewProps, type ViewRef } from "../../../components/View.js";
import { layoutView } from "../../layout/view.js";
import type {
    LayoutChild,
    LayoutConstraints,
    LayoutResult,
    LayoutRect,
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
    layout: LayoutRect;
    readonly publicInstance: ViewRef;
};

export function createView(props: HostProps): NoctisView {
    let instance: NoctisView;

    instance = {
        "kind": "component",
        "type": COMPONENT_NAME,
        "component": view,
        "props": props as Readonly<ViewProps>,
        "children": [],
        "hidden": false,
        "layout": {
            "x": 0,
            "y": 0,
            "width": 0,
            "height": 0,
        },
        "publicInstance": {
            get x() {
                return instance.layout.x;
            },
            get y() {
                return instance.layout.y;
            },
            get width() {
                return instance.layout.width;
            },
            get height() {
                return instance.layout.height;
            },
        },
    };

    return instance;
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
