import type Reconciler from "react-reconciler";
import type { ViewProps } from "../../.cache/reconciler-types/components/View.js";
import type {
    NoctisChild,
    reconciler,
} from "../../.cache/reconciler-types/render/reconciler/index.js";
import type { NoctisView } from "../../.cache/reconciler-types/render/reconciler/components/view.js";

type Equal<Left, Right> =
    (<Value>() => Value extends Left ? 1 : 2) extends
    (<Value>() => Value extends Right ? 1 : 2)
        ? true
        : false;

type Assert<Condition extends true> = Condition;

type ReconcilerInstance<Value> = Value extends Reconciler.Reconciler<
    any,
    infer Instance,
    any,
    any,
    any,
    any
>
    ? Instance
    : never;

type ViewUsesViewProps = Assert<
    Equal<NoctisView["props"], Readonly<ViewProps>>
>;

type ViewIsAChild = Assert<NoctisView extends NoctisChild ? true : false>;

type ReconcilerUsesViewInstances = Assert<
    Equal<ReconcilerInstance<typeof reconciler>, NoctisView>
>;

export type ReconcilerTypeContract =
    | ViewUsesViewProps
    | ViewIsAChild
    | ReconcilerUsesViewInstances;
