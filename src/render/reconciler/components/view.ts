import type { ViewProps } from "../../../components/View.js";
import type {
    HostComponent,
    HostProps,
    NoctisChild,
} from "../index.js";

export const VIEW_TYPE = "noctis-view";

export type NoctisView = {
    readonly kind: "component";
    readonly type: typeof VIEW_TYPE;
    readonly component: HostComponent;
    props: Readonly<ViewProps>;
    readonly children: NoctisChild[];
    hidden: boolean;
};

function getViewProps(props: HostProps): Readonly<ViewProps> {
    return props as Readonly<ViewProps>;
}

export function createView(props: HostProps): NoctisView {
    return {
        kind: "component",
        type: VIEW_TYPE,
        component: view,
        props: getViewProps(props),
        children: [],
        hidden: false,
    };
}

const view: HostComponent = {
    type: VIEW_TYPE,

    render(props, children) {

    },
};

export default view;
