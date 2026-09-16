import type { ReactNode } from "react";

export type HostProps = Readonly<{
    children?: ReactNode;
} & Record<string, unknown>>;

export type RegisteredHostComponent = {
    readonly type: string;
    create(props: HostProps): unknown;
    update(
        instance: HostInstance,
        previousProps: HostProps,
        nextProps: HostProps,
    ): void;
    serialize(instance: HostInstance, children: string): string;
};

export type HostInstance = {
    readonly kind: "host";
    readonly type: string;
    readonly definition: RegisteredHostComponent;
    props: HostProps;
    state: unknown;
    readonly children: HostChild[];
    hidden: boolean;
};

export type TextInstance = {
    readonly kind: "text";
    text: string;
    hidden: boolean;
};

export type HostChild = HostInstance | TextInstance;

export type RootContainer = {
    readonly children: HostChild[];
    renderedText: string;
    renderError: Error | null;
    isRendering: boolean;
};

export type PublicInstance = HostInstance | TextInstance;
export type TimeoutHandle = ReturnType<typeof setTimeout>;

export type HostComponentInstance<Props extends object, State> =
    Omit<HostInstance, "props" | "state"> & {
        props: Readonly<Props>;
        state: State;
    };

export type HostComponentDefinition<Props extends object, State> = {
    readonly type: string;
    create(props: Readonly<Props>): State;
    update?(
        instance: HostComponentInstance<Props, State>,
        previousProps: Readonly<Props>,
        nextProps: Readonly<Props>,
    ): void;
    serialize(
        instance: HostComponentInstance<Props, State>,
        children: string,
    ): string;
};

export function defineHostComponent<Props extends object, State>(
    definition: HostComponentDefinition<Props, State>,
): RegisteredHostComponent {
    return {
        type: definition.type,

        create(props): State {
            return definition.create(props as unknown as Readonly<Props>);
        },

        update(instance, previousProps, nextProps): void {
            definition.update?.(
                instance as unknown as HostComponentInstance<Props, State>,
                previousProps as unknown as Readonly<Props>,
                nextProps as unknown as Readonly<Props>,
            );
        },

        serialize(instance, children): string {
            return definition.serialize(
                instance as unknown as HostComponentInstance<Props, State>,
                children,
            );
        },
    };
}
