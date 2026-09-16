import type { HostComponent, HostProps } from "../index.js";
import text, {
    createText,
    TEXT_TYPE,
    type NoctisText,
} from "./Text.js";
import view, {
    createView,
    VIEW_TYPE,
    type NoctisView,
} from "./View.js";

const definitions: readonly HostComponent[] = [view, text];
const components = new Map(
    definitions.map((definition) => [definition.type, definition] as const),
);

export function resolveHostComponent(type: string): HostComponent {
    const component = components.get(type);

    if (component === undefined) {
        throw new Error(`Unsupported component type: ${type}`);
    }

    return component;
}

export function createHostInstance(
    type: string,
    props: HostProps,
): NoctisView | NoctisText {
    resolveHostComponent(type);

    switch (type) {
        case VIEW_TYPE:
            return createView(props);
        case TEXT_TYPE:
            return createText(props);
        default:
            throw new Error(`Unsupported component type: ${type}`);
    }
}
