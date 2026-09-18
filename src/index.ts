import Renderer from "@/render/index.js";

export {
    Renderer
};

import View, { type ViewRef } from "./components/View.js";
import Text, { type TextRef } from "./components/Text.js";

export {
    View,
    Text,
    type ViewRef,
    type TextRef
};

import useConsoleSize from "./hooks/useConsoleSize.js";
import useInput from "./hooks/useInput.js";
import useMouse from "./hooks/useMouse.js";
import useCursor from "./hooks/useCursor.js";

export {
    useConsoleSize,
    useInput,
    useMouse,
    useCursor
};
