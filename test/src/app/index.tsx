import { useConsoleSize, useMouse, useInput, View, useCursor, ViewRef } from "noctui";
import { useEffect, useRef } from "react";

export default function App() {
    const { width, height } = useConsoleSize();
    const stdIn = useInput();
    const mouse = useMouse();
    const cursor = useCursor({ "show": true });
    const ref = useRef<ViewRef>(null);

    useEffect(() => {
        if (!mouse) return;

        cursor.x(mouse.x);
        cursor.y(mouse.y);
    }, [mouse]);

    return (
        <View
            style={{
                "backgroundColor": "blue",
                "paddingTop": 10
            }}
            ref={ref}
        >
            
        </View>
    );
}
