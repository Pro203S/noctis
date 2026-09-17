import { PassThrough } from "node:stream";
import { emitKeypressEvents, type Key } from "node:readline";
import { useEffect, useState } from "react";

type PressedKey = {
    name: string;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
};

const keyboardStream = new PassThrough();

emitKeypressEvents(keyboardStream);

export default function useInput() {
    const [lastInputed, setLastInputed] = useState<PressedKey>();

    useEffect(() => {
        const onData = (data: Buffer) => {
            const input = data.toString();

            // SGR Mouse Event
            if (/^\x1b\[<\d+;\d+;\d+[Mm]$/.test(input)) {
                return;
            }

            keyboardStream.write(data);
        };

        const onKeypress = (str: string | undefined, key: Key) => {
            setLastInputed({
                name: key.name ?? str ?? "",
                shift: key.shift ?? false,
                ctrl: key.ctrl ?? false,
                alt: key.meta ?? false,
                meta: false,
            });
        };

        process.stdin.on("data", onData);
        keyboardStream.on("keypress", onKeypress);

        return () => {
            process.stdin.off("data", onData);
            keyboardStream.off("keypress", onKeypress);
        };
    }, []);

    return lastInputed;
}