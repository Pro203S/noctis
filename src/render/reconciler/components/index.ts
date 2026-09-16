import type { HostComponent, HostProps } from "../index.js";
import view, { createView, type NoctisView } from "./view.js";

const definitions: readonly HostComponent[] = [view];
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
): NoctisView {
    resolveHostComponent(type);
    return createView(props);
}
