import { ViewStyle } from "@/render/styles.js";
import View from "./View.js";

type Props = {
    "label": string,
    "onClick"?: () => any;
    "style"?: ViewStyle
}

export default function Button(props: Props) {
    const { label, onClick, style } = props;
    
    return <View>

    </View>;
}