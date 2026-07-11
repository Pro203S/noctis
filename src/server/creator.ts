import http from 'node:http';
import https from 'node:https';

export type HTTPServer = http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export type ServerHandler = http.RequestListener<typeof http.IncomingMessage, typeof http.ServerResponse>;

export default function createServer(handler: ServerHandler, secure?: boolean, key?: string, cert?: string): HTTPServer {
    if (secure) {
        const server = https.createServer({
            key,
            cert
        }, handler);

        return server;
    }

    return http.createServer(handler);
}