import { createContext } from "react";
import ReactReconciler from "react-reconciler";
import {
    DefaultEventPriority,
    NoEventPriority,
} from "react-reconciler/constants.js";
import { resolveHostComponent } from "./components/index.js";
import { redraw } from "./terminal.js";
import {
    appendChild,
    insertChild,
    removeChild,
    resetChildren,
} from "./tree.js";
import type {
    HostChild,
    HostInstance,
    HostProps,
    PublicInstance,
    RootContainer,
    TextInstance,
    TimeoutHandle,
} from "./types.js";

let currentUpdatePriority: ReactReconciler.EventPriority = NoEventPriority;

const hostTransitionContext = createContext<null>(null) as unknown as
    ReactReconciler.ReactContext<null>;

const hostConfig = {
    rendererVersion: "0.0.0",
    rendererPackageName: "noctis",
    isPrimaryRenderer: true,
    warnsIfNotActing: false,
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    supportsMicrotasks: true,

    getRootHostContext(): null {
        return null;
    },

    getChildHostContext(): null {
        return null;
    },

    getPublicInstance(instance: PublicInstance): PublicInstance {
        return instance;
    },

    prepareForCommit(): null {
        return null;
    },

    resetAfterCommit(container: RootContainer): void {
        redraw(container);
    },

    createInstance(type: string, props: HostProps): HostInstance {
        const definition = resolveHostComponent(type);

        return {
            kind: "host",
            type,
            definition,
            props,
            state: definition.create(props),
            children: [],
            hidden: false,
        };
    },

    createTextInstance(text: string): TextInstance {
        return {
            kind: "text",
            text,
            hidden: false,
        };
    },

    appendInitialChild(parent: HostInstance, child: HostChild): void {
        appendChild(parent.children, child);
    },

    finalizeInitialChildren(): false {
        return false;
    },

    shouldSetTextContent(): false {
        return false;
    },

    preparePortalMount(): void {},

    scheduleTimeout(
        callback: (...args: unknown[]) => unknown,
        delay?: number,
    ): TimeoutHandle {
        return setTimeout(callback, delay);
    },

    cancelTimeout(timeout: TimeoutHandle): void {
        clearTimeout(timeout);
    },

    noTimeout: -1 as const,

    scheduleMicrotask(callback: () => unknown): void {
        queueMicrotask(callback);
    },

    getInstanceFromNode(): null {
        return null;
    },

    beforeActiveInstanceBlur(): void {},
    afterActiveInstanceBlur(): void {},
    prepareScopeUpdate(): void {},

    getInstanceFromScope(): null {
        return null;
    },

    detachDeletedInstance(): void {},

    appendChild(parent: HostInstance, child: HostChild): void {
        appendChild(parent.children, child);
    },

    appendChildToContainer(container: RootContainer, child: HostChild): void {
        appendChild(container.children, child);
    },

    insertBefore(
        parent: HostInstance,
        child: HostChild,
        beforeChild: HostChild,
    ): void {
        insertChild(parent.children, child, beforeChild);
    },

    insertInContainerBefore(
        container: RootContainer,
        child: HostChild,
        beforeChild: HostChild,
    ): void {
        insertChild(container.children, child, beforeChild);
    },

    removeChild(parent: HostInstance, child: HostChild): void {
        removeChild(parent.children, child);
    },

    removeChildFromContainer(container: RootContainer, child: HostChild): void {
        removeChild(container.children, child);
    },

    resetTextContent(instance: HostInstance): void {
        resetChildren(instance);
    },

    commitTextUpdate(
        instance: TextInstance,
        _oldText: string,
        newText: string,
    ): void {
        instance.text = newText;
    },

    commitUpdate(
        instance: HostInstance,
        _type: string,
        previousProps: HostProps,
        nextProps: HostProps,
    ): void {
        instance.definition.update?.(instance, previousProps, nextProps);
        instance.props = nextProps;
    },

    hideInstance(instance: HostInstance): void {
        instance.hidden = true;
    },

    hideTextInstance(instance: TextInstance): void {
        instance.hidden = true;
    },

    unhideInstance(instance: HostInstance): void {
        instance.hidden = false;
    },

    unhideTextInstance(instance: TextInstance, text: string): void {
        instance.hidden = false;
        instance.text = text;
    },

    clearContainer(container: RootContainer): void {
        container.children.length = 0;
    },

    NotPendingTransition: null,
    HostTransitionContext: hostTransitionContext,

    setCurrentUpdatePriority(priority: ReactReconciler.EventPriority): void {
        currentUpdatePriority = priority;
    },

    getCurrentUpdatePriority(): ReactReconciler.EventPriority {
        return currentUpdatePriority;
    },

    resolveUpdatePriority(): ReactReconciler.EventPriority {
        return currentUpdatePriority === NoEventPriority
            ? DefaultEventPriority
            : currentUpdatePriority;
    },

    resetFormInstance(): void {},

    requestPostPaintCallback(callback: (time: number) => void): void {
        setTimeout(() => callback(Date.now()), 0);
    },

    shouldAttemptEagerTransition(): false {
        return false;
    },

    trackSchedulerEvent(): void {},

    resolveEventType(): null {
        return null;
    },

    resolveEventTimeStamp(): number {
        return -1;
    },

    maySuspendCommit(): false {
        return false;
    },

    maySuspendCommitOnUpdate(): false {
        return false;
    },

    maySuspendCommitInSyncRender(): false {
        return false;
    },

    preloadInstance(): true {
        return true;
    },

    startSuspendingCommit(): null {
        return null;
    },

    suspendInstance(): void {},
    suspendOnActiveViewTransition(): void {},

    waitForCommitToBeReady(): null {
        return null;
    },

    getSuspendedCommitReason(): null {
        return null;
    },
};

export default hostConfig;
