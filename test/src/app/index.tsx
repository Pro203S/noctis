import { Text, useConsoleSize, useMouse, useInput, View, useCursor } from "noctis";
import { useEffect } from "react";

export default function App() {
    const { width, height } = useConsoleSize();
    const stdIn = useInput();
    const mouse = useMouse();
    const cursor = useCursor();

    useEffect(() => {
        if (!mouse) return;

        cursor.show(mouse.button === "left");
        cursor.x(mouse.x);
        cursor.y(mouse.y);
    }, [mouse]);

    return (
        <View style={{
            "backgroundGradient": {
                "start": "#125825",
                "rotation": 180,
                "end": "magenta"
            },
            width,
            height
        }}>
            <Text>{width}, {height}, {JSON.stringify(stdIn)}, {JSON.stringify(mouse)}</Text>
        </View>
    );
}
