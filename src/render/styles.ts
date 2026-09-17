type ConsoleColor =
    | "black"
    | "red"
    | "green"
    | "yellow"
    | "blue"
    | "magenta"
    | "cyan"
    | "white"
    | "brightBlack"
    | "brightRed"
    | "brightGreen"
    | "brightYellow"
    | "brightBlue"
    | "brightMagenta"
    | "brightCyan"
    | "brightWhite"
    | `#${string}`;

export function isHexColor(value: string): value is ConsoleColor {
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

type GradientColor = {
    "start": ConsoleColor,
    "end": ConsoleColor,
    "rotation": number
};

export type ViewStyle = Partial<{
    "width": number,
    "height": number,

    "position": "static" | "relative" | "absolute",
    "top": number,
    "right": number,
    "bottom": number,
    "left": number,

    "zIndex": number,

    "display": "flex",
    "flexDirection": "row" | "column",
    "justifyContent": "center" | "space-between" | "space-evenly" | "flex-start" | "flex-end",
    "alignItems": "stretch" | "center" | "flex-start" | "flex-end"

    "backgroundColor": ConsoleColor,
    "backgroundGradient": GradientColor,

    "margin": number,
    "marginHorizontal": number,
    "marginVertical": number,
    "marginTop": number,
    "marginRight": number,
    "marginBottom": number,
    "marginLeft": number,
    "padding": number,

    "paddingHorizontal": number,
    "paddingVertical": number,
    "paddingTop": number,
    "paddingRight": number,
    "paddingBottom": number,
    "paddingLeft": number,

    "borderStyle": "solid" | "dotted" | "doubleline";
    "borderWidth": "bold" | "normal";
    "borderColor": ConsoleColor
}>;

export type TextStyle = Partial<{
    "color": ConsoleColor,
    "gradientColor": GradientColor,
    "letterSpacing": number,
    "textStyle": ("bold" | "dim" | "italic" | "underline" | "doubleUnderline" | "strikethrough" | "inverse" | "hidden" | "blink")[],
    "width": number,
    "height": number,
    "wrap": ("word" | "char" | "none" | "truncate")[],
}>;

export default class Styles {
    static create(styles: ViewStyle | TextStyle) {
        return styles;
    }
}
