// renderer

import Renderer from "./render/index.js";

export default Renderer;

// components

import View from "./components/View.js";
import Text from "./components/Text.js";

export {
    View,
    Text,
    Button
};

// refs

import { type ViewRef } from "./components/View.js";
import { type TextRef } from "./components/Text.js";

export {
    type ViewRef,
    type TextRef,
};

// hooks

import useConsoleSize from "./hooks/useConsoleSize.js";
import useInput from "./hooks/useInput.js";
import useMouse from "./hooks/useMouse.js";
import useCursor from "./hooks/useCursor.js";
import Button from "./components/Button.js";
import useMouseByKeyboard from "./hooks/useMouseByKeyboard.js";

export {
    useConsoleSize,
    useInput,
    useMouse,
    useCursor,
    useMouseByKeyboard
};
