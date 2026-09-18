import { Button, Text, useInput, useMouse, useMouseByKeyboard, View } from "noctui";

export default function App() {
    const mouseByKeyboard = useMouseByKeyboard({ "initialStatus": true });
    const input = useInput();
    const mouse = useMouse();

    return <View>
        <Button label="pressme" />
        <Text>{JSON.stringify(input, null, 4)}</Text>
        <Text>{JSON.stringify(mouse, null, 4)}</Text>
    </View>;
}
