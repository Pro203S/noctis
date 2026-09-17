import type Reconciler from "react-reconciler";
import type { TextProps } from "../../.cache/reconciler-types/components/Text.js";
import type { ViewProps } from "../../.cache/reconciler-types/components/View.js";
import type {
    NoctisChild,
    NoctisTextInstance,
    reconciler,
} from "../../.cache/reconciler-types/render/reconciler/index.js";
import type textComponent from "../../.cache/reconciler-types/render/reconciler/components/Text.js";
import type { NoctisText } from "../../.cache/reconciler-types/render/reconciler/components/Text.js";
import type viewComponent from "../../.cache/reconciler-types/render/reconciler/components/View.js";
import type { NoctisView } from "../../.cache/reconciler-types/render/reconciler/components/View.js";
import type { ViewStyle } from "../../.cache/reconciler-types/render/styles.js";

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

type ReconcilerTextInstance<Value> = Value extends Reconciler.Reconciler<
    any,
    any,
    infer TextInstance,
    any,
    any,
    any
>
    ? TextInstance
    : never;

type ViewUsesViewProps = Assert<
    Equal<NoctisView["props"], Readonly<ViewProps>>
>;

type ViewIsAChild = Assert<NoctisView extends NoctisChild ? true : false>;

type ViewRenderUsesViewProps = Assert<
    Equal<
        Parameters<typeof viewComponent.render>[0],
        Readonly<ViewProps>
    >
>;

type TextUsesTextProps = Assert<
    Equal<NoctisText["props"], Readonly<TextProps>>
>;

type TextIsAChild = Assert<NoctisText extends NoctisChild ? true : false>;

type TextRenderUsesTextProps = Assert<
    Equal<
        Parameters<typeof textComponent.render>[0],
        Readonly<TextProps>
    >
>;

type RawTextIsAChild = Assert<
    NoctisTextInstance extends NoctisChild ? true : false
>;

type ReconcilerUsesHostInstances = Assert<
    Equal<ReconcilerInstance<typeof reconciler>, NoctisView | NoctisText>
>;

type ReconcilerUsesRawTextInstances = Assert<
    Equal<ReconcilerTextInstance<typeof reconciler>, NoctisTextInstance>
>;

const validViewAlignment = {
    alignItems: "stretch",
} satisfies ViewStyle;

const invalidViewAlignment = {
    // @ts-expect-error space distribution belongs to justifyContent
    alignItems: "space-between",
} satisfies ViewStyle;

void validViewAlignment;
void invalidViewAlignment;

export type ReconcilerTypeContract =
    | ViewUsesViewProps
    | ViewIsAChild
    | ViewRenderUsesViewProps
    | TextUsesTextProps
    | TextIsAChild
    | TextRenderUsesTextProps
    | RawTextIsAChild
    | ReconcilerUsesHostInstances
    | ReconcilerUsesRawTextInstances;
