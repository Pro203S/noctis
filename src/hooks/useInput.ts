import { useEffect, useState } from "react";
import { emitKeypressEvents, type Key } from "node:readline";

emitKeypressEvents(process.stdin);

type PressedKey = {
    "name": string,
    "shift": boolean,
    "ctrl": boolean,
    "alt": boolean,
    "meta": boolean
};

export default function useInput() {
    const [lastInputed, setLastInputed] = useState<PressedKey>();

    useEffect(() => {
        const cb = (str: string | undefined, key: Key) => {
            setLastInputed({
                "name": key.name ?? str ?? "",
                "shift": key.shift ?? false,
                "ctrl": key.ctrl ?? false,
                "alt": key.meta ?? false,
                "meta": false,
            });
        };

        process.stdin.on("keypress", cb);

        return () => {
            process.stdin.off("keypress", cb);
        };
    }, []);

    return lastInputed;
}