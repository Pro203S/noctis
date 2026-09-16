import { useEffect, useState } from "react";

type Size = {
    width: number;
    height: number;
}

export default function useConsoleSize() {
    const [width, setWidth] = useState(process.stdout.columns);
    const [height, setHeight] = useState(process.stdout.rows);

    useEffect(() => {
        const cb = () => {
            setWidth(process.stdout.columns);
            setHeight(process.stdout.rows);
        };
        process.stdout.on("resize", cb);

        return () => { process.stdout.off("resize", cb); };
    }, []);

    return { width, height } satisfies Size;
}