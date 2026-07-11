import http from 'node:http';
import https from 'node:https';

type Server = (req: http.IncomingMessage, res: http.OutgoingMessage) => any;

export default function createServer(handler: Server, secure?: boolean, key?: string, cert?: string) {
    if (secure) {
        const server = https.createServer({
            key,
            cert
        }, handler);

        return server;
    }

    return http.createServer(handler);
}