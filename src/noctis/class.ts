import type { HTTPServer, ServerHandler } from "../server/creator";
import createServer from "../server/creator";
import type { NoctisConfig } from "../types";

export default class Noctis {
    private _server!: HTTPServer;
    
    constructor(public config: NoctisConfig) {
        const handler: ServerHandler = (req, res) => {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(req));
        };

        this._server = createServer(handler, Boolean(config.https), config.https?.cert, config.https?.key);
    }

    listen() {
        return new Promise<void>((resolve, reject) => {
            try {
                this._server.listen(this.config.port ?? 3000, resolve);
            } catch (err) {
                reject(err);
            }
        });
    }
}