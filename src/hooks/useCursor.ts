import { useEffect, useState } from "react";

type Parameters = Partial<{
    "show": boolean,
    "x": number,
    "y": number
}>;

export default function useCursor(params?: Parameters) {
    const [showCursor, setShowCursor] = useState(params?.show ?? false);
    const [x, setX] = useState(params?.x ?? 0);
    const [y, setY] = useState(params?.y ?? 0);

    useEffect(() => {
        process.stdout.write(`\x1b[${y};${x}H`);
    }, [x, y]);

    useEffect(() => {
        if (showCursor)
            process.stdout.write("\x1b[?25h");
        else
            process.stdout.write("\x1b[?25l");
    }, [showCursor]);

    return {
        "setShow": setShowCursor,
        "setX": setX,
        "setY": setY,
        "show": showCursor,
        "x": x,
        "y": y
    };
}