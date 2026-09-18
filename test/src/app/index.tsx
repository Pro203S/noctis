import { Text, useConsoleSize, useMouse, useInput, View, useCursor } from "noctui";
import { useEffect, useState } from "react";

export default function App() {
    const { width, height } = useConsoleSize();
    const stdIn = useInput();
    const mouse = useMouse();
    const cursor = useCursor({ "show": true });
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!mouse) return;

        cursor.x(mouse.x);
        cursor.y(mouse.y);
    }, [mouse]);

    useEffect(() => {
        setCount(v => v + 1);
    }, [stdIn]);

    return (
        <View style={{
            "backgroundColor": "blue",
            width,
            height,
            "justifyContent": "center",
            "alignItems": "center",
            "display": "flex"
        }}>
            <Text>{width}, {height}, {JSON.stringify(stdIn)}, {JSON.stringify(mouse)}</Text>
            <Text>{count}</Text>
        </View>
    );
}
