import type { RegisteredHostComponent } from "../types.js";
import view from "./view.js";

const definitions: readonly RegisteredHostComponent[] = [view];
const components = new Map(
    definitions.map((definition) => [definition.type, definition] as const),
);

export function resolveHostComponent(type: string): RegisteredHostComponent {
    const component = components.get(type);

    if (component === undefined) {
        throw new Error(`Unsupported component type: ${type}`);
    }

    return component;
}
