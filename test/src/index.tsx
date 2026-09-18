import NoctUI from "noctui";
import App from "./app/index.js";

const noctui = new NoctUI();

noctui.setTitle("NoctUI Test");
noctui.render(<App />);
