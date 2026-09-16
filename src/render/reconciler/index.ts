import type { ReactNode } from "react";
import ReactReconciler from "react-reconciler";
import { ConcurrentRoot } from "react-reconciler/constants.js";
import hostConfig from "./hostConfig.js";
import type {
    HostInstance,
    HostProps,
    PublicInstance,
    RootContainer,
    TextInstance,
    TimeoutHandle,
} from "./types.js";

const reconciler = ReactReconciler<
    string,
    HostProps,
    RootContainer,
    HostInstance,
    TextInstance,
    never,
    never,
    never,
    PublicInstance,
    null,
    never,
    TimeoutHandle,
    -1,
    null
>(hostConfig);

function reportCaughtError(error: Error): void {
    console.error(error);
}

function reportRecoverableError(error: Error): void {
    console.error(error);
}

export type ReconcilerRoot = ReturnType<typeof reconciler.createContainer>;

export function createRoot(container: RootContainer): ReconcilerRoot {
    return reconciler.createContainer(
        container,
        ConcurrentRoot,
        null,
        false,
        null,
        "",
        (error) => {
            if (container.isRendering) {
                container.renderError = error;
                return;
            }

            queueMicrotask(() => {
                throw error;
            });
        },
        reportCaughtError,
        reportRecoverableError,
        () => {},
    );
}

export function updateRoot(root: ReconcilerRoot, node: ReactNode): void {
    reconciler.updateContainerSync(node, root, null);
    reconciler.flushSyncWork();
}

export type { RootContainer } from "./types.js";
