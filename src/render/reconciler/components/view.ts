import type { ViewProps } from "../../../components/View.js";
import type { HostComponent, HostProps } from "../index.js";

export const VIEW_TYPE = "noctis-view";

function getViewProps(props: HostProps): Readonly<ViewProps> {
    return props as Readonly<ViewProps>;
}

function renderView(_props: Readonly<ViewProps>, children: string): string {
    return children;
}

const view: HostComponent = {
    type: VIEW_TYPE,

    render(props, children) {
        return renderView(getViewProps(props), children);
    },
};

export default view;
