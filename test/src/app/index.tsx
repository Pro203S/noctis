import { Text, useConsoleSize, useCursor, useInput, View } from "noctis";

export default function App() {
    const { width, height } = useConsoleSize();
    const stdIn = useInput();
    const mouse = useCursor();

    return (
        <View style={{ "backgroundColor": "#020202" }}>
            <Text>{width}, {height}, {JSON.stringify(stdIn)}, {JSON.stringify(mouse)}</Text>
        </View>
    );
}
