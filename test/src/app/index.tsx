import { Text, useConsoleSize, View } from "noctis";

export default function App() {
    const { height } = useConsoleSize();

    return (
        <View style={{ height }}>
            <Text>Hello from Noctis!</Text>
        </View>
    );
}
