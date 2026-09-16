import type {
    HostChild,
    HostInstance,
    RootContainer,
} from "./types.js";

export function appendChild(children: HostChild[], child: HostChild): void {
    const currentIndex = children.indexOf(child);

    if (currentIndex !== -1) {
        children.splice(currentIndex, 1);
    }

    children.push(child);
}

export function insertChild(
    children: HostChild[],
    child: HostChild,
    beforeChild: HostChild,
): void {
    if (child === beforeChild) {
        return;
    }

    const currentIndex = children.indexOf(child);

    if (currentIndex !== -1) {
        children.splice(currentIndex, 1);
    }

    const targetIndex = children.indexOf(beforeChild);

    if (targetIndex === -1) {
        throw new Error("삽입 기준이 되는 호스트 자식을 찾을 수 없습니다.");
    }

    children.splice(targetIndex, 0, child);
}

export function removeChild(children: HostChild[], child: HostChild): void {
    const index = children.indexOf(child);

    if (index !== -1) {
        children.splice(index, 1);
    }
}

function serializeChild(child: HostChild): string {
    if (child.hidden) {
        return "";
    }

    if (child.kind === "text") {
        return child.text;
    }

    const children = child.children.map(serializeChild).join("");
    return child.definition.serialize(child, children);
}

export function serializeContainer(container: RootContainer): string {
    return container.children.map(serializeChild).join("");
}

export function resetChildren(instance: HostInstance): void {
    instance.children.length = 0;
}
