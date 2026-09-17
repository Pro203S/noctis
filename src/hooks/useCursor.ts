import { useEffect, useState } from "react";

export default function useCursor() {
    const [showCursor, setShowCursor] = useState(false);
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);

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
        "show": setShowCursor,
        "x": setX,
        "y": setY
    };
}