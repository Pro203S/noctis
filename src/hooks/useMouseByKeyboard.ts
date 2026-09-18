import { useEffect, useState } from "react"
import useCursor from "./useCursor.js";
import useInput from "./useInput.js";
import inputManager from "../modules/inputMgr.js";

type Props = {
    "initialStatus"?: boolean;
}

export default function useMouseByKeyboard(props?: Props) {
    const { initialStatus } = props ?? {};
    const [enabled, setEnabled] = useState(initialStatus ?? false);
    const cursor = useCursor();
    const input = useInput();

    const [mouseX, setMouseX] = useState(1);
    const [mouseY, setMouseY] = useState(1);

    const [shifted, setShifted] = useState(false);

    useEffect(() => {
        if (!enabled) {
            cursor.setShow(false);
            return;
        }

        cursor.setShow(true);

        if (!input) return;

        const move = input.shift ? 2 : 1;
        setShifted(input.shift);

        if (input.name === "up") {
            setMouseY(v => Math.max(1, v - move));
            return;
        }

        if (input.name === "down") {
            setMouseY(v => v + move);
            return;
        }

        if (input.name === "right") {
            setMouseX(v => v + move);
            return;
        }

        if (input.name === "left") {
            setMouseX(v => Math.max(1, v - move));
            return;
        }
    }, [enabled, input]);

    useEffect(() => {
        if (!enabled) return;

        cursor.setX(mouseX);
        cursor.setY(mouseY);

        inputManager.emitMouse({
            "x": mouseX - 1,
            "y": mouseY - 1,
            "button": "none",
            "action": "move",
            "shift": shifted,
            "ctrl": false,
            "alt": false,
        });
    }, [mouseX, mouseY, enabled]);

    return (enable: boolean) => setEnabled(enable);
}