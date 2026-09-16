export type ViewStyle = Partial<{
    "position": "static";
}>;

export type TextStyle = Partial<{

}>;

export default class Styles {
    static create(styles: ViewStyle | TextStyle) {
        return styles;
    }
}