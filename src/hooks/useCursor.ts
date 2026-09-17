import { useEffect, useState } from "react";

type CursorEvent = {
    "x": number,
    "y": number,
    "button"?: 0 | 1 | 2,
    "action": "press" | "release" | "move" | "drag";
}

function parseMouse(data: string): CursorEvent | null {
    const match = data.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);

    if (!match) {
        return null;
    }

    const button = Number(match[1]);
    if (button === 35) return {
        "action": "move",
        "x": Number(match[2]),
        "y": Number(match[3])
    };

    return {
        "action": button >= 32 ? "drag" : (match[4] === "M" ? "press" : "release"),
        "x": Number(match[2]),
        "y": Number(match[3]),
        "button": (button >= 32 ? button - 32 : button) as 0 | 1 | 2
    };
}

export default function useCursor() {
    const [status, setStatus] = useState<CursorEvent>();

    useEffect(() => {
        const cb = (data: Buffer) => {
            const d = parseMouse(data.toString());
            if (!d) return;

            setStatus(d);
        }

        process.stdin.on("data", cb);

        return () => { process.stdin.off("data", cb); };
    }, []);

    return status;
}