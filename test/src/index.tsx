import { View, useConsoleSize } from 'noctis';
import { useEffect } from 'react';

function Component() {
    const { width, height } = useConsoleSize();

    useEffect(() => {
        console.log(width, height)
    }, [width, height])

    return <View style={{ "backgroundColor": `#da1311` }}>

    </View>;
}

console.log(<Component />);