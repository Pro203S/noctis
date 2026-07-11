import type { HTTPServer, ServerHandler } from "../server/creator";
import createServer from "../server/creator";
import type { NoctisConfig } from "../types";

export default class Noctis {
    private _server!: HTTPServer;
    
    constructor(public config: NoctisConfig) {
        const handler: ServerHandler = (req, res) => {

        };

        this._server = createServer(handler, Boolean(config.https), config.https?.cert, config.https?.key);
    }

    
}