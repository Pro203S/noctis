import { useEffect, useState } from "react";

type Parameters = {
    "encoding": BufferEncoding;
}

export default function useInput(params?: Parameters) {
    const { encoding } = params ?? { "encoding": "utf-8" };
    const [lastInputed, setLastInputed] = useState("");

    useEffect(() => {
        const cb = (data: Buffer) => {
            setLastInputed(data.toString(encoding));
        }

        process.stdin.on("data", cb);

        return () => { process.stdin.off("data", cb); };
    }, []);

    return lastInputed;
}