import { View, useConsoleSize } from 'noctis';
import { useEffect } from 'react';

function Component() {
    const { width, height } = useConsoleSize();

    useEffect(() => {
        console.log(width, height)
    }, [width, height])

    return <View></View>;
}

console.log(<Component />);