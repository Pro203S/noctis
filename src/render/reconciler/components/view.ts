import { COMPONENT_NAME } from "../../../components/View.js";
import type { ViewProps } from "../../../components/View.js";
import { defineHostComponent } from "../types.js";

const view = defineHostComponent<ViewProps, null>({
    type: COMPONENT_NAME,

    create(): null {
        return null;
    },

    serialize(_instance, children): string {
        return children;
    },
});

export default view;
