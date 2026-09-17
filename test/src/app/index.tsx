import { Text, useConsoleSize, useInput, View } from "noctis";

export default function App() {
    const { width, height } = useConsoleSize();
    const stdIn = useInput();

    return (
        <View style={{ "backgroundColor": "red" }}>
            <Text>{width}, {height}, {stdIn}</Text>
        </View>
    );
}
