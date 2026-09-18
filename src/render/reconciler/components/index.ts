import type { HostComponent, HostProps } from "../index.js";
import text, {
    createText,
    type NoctUIText,
} from "./Text.js";
import { COMPONENT_NAME as TEXT_COMPONENT_NAME } from "../../../components/Text.js";
import view, {
    createView,
    type NoctUIView,
} from "./View.js";
import { COMPONENT_NAME as VIEW_COMPONENT_NAME } from "../../../components/View.js";

type HostDefinition = Readonly<{ type: string }>;

const definitions: readonly HostDefinition[] = [view, text];
const components = new Map(
    definitions.map((definition) => [definition.type, definition] as const),
);

export function resolveHostComponent(type: string): HostDefinition {
    const component = components.get(type);

    if (component === undefined) {
        throw new Error(`"${type}" is not supported. Did you use an HTML element by mistake?`);
    }

    return component;
}

export function createHostInstance(
    type: string,
    props: HostProps,
): NoctUIView | NoctUIText {
    resolveHostComponent(type);

    switch (type) {
        case VIEW_COMPONENT_NAME:
            return createView(props);
        case TEXT_COMPONENT_NAME:
            return createText(props);
        default:
            throw new Error(`"${type}" is not supported. Did you use an HTML element by mistake?`);
    }
}
