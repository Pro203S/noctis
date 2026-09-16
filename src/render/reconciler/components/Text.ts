import type { TextProps } from "../../../components/Text.js";
import type {
    HostComponent,
    HostProps,
    NoctisChild,
} from "../index.js";

export const TEXT_TYPE = "noctis-text";

export type NoctisText = {
    readonly kind: "component";
    readonly type: typeof TEXT_TYPE;
    readonly component: HostComponent;
    props: Readonly<TextProps>;
    readonly children: NoctisChild[];
    hidden: boolean;
};

function getTextProps(props: HostProps): Readonly<TextProps> {
    return props as Readonly<TextProps>;
}

export function createText(props: HostProps): NoctisText {
    return {
        kind: "component",
        type: TEXT_TYPE,
        component: text,
        props: getTextProps(props),
        children: [],
        hidden: false,
    };
}

const text: HostComponent = {
    type: TEXT_TYPE,

    render(_props, children) {
        return children;
    },
};

export default text;
