import { View, Text, useMouse } from "noctui";

export default function App() {
    const mouse = useMouse();

    return <View>
        <Text>{mouse ? JSON.stringify(mouse, null, 4) : "Try using your mouse in the terminal"}</Text>
    </View>;
}
