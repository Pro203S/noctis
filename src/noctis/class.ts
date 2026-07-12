import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { detectBufferMimeType } from "../lib/mime";
import NoctisError from "../lib/noctisError";
import usNow from "../lib/us";
import type { HTTPServer, ServerHandler } from "../server/creator";
import createServer from "../server/creator";
import type { NoctisConfig, NoctisRouteHandler, NoctisRouteHandlerCallback } from "../types";

type HandlerInfo = {
    "cb": NoctisRouteHandlerCallback,
    "method": string,
    "path": string
};

type MatchedHandler = HandlerInfo & {
    "pathParams": Record<string, string>
};

const matchRoute = (route: string, pathname: string): Record<string, string> | null => {
    const routeSegments = route.split("/").filter(Boolean);
    const pathSegments = pathname.split("/").filter(Boolean);
    const wildcardIndex = routeSegments.findIndex(segment => segment.startsWith("*"));

    if (wildcardIndex !== -1) {
        if (wildcardIndex !== routeSegments.length - 1 || pathSegments.length < wildcardIndex) return null;
    } else if (routeSegments.length !== pathSegments.length) {
        return null;
    }

    const pathParams: Record<string, string> = {};

    for (let index = 0; index < routeSegments.length; index++) {
        const routeSegment = routeSegments[index]!;

        if (routeSegment.startsWith("*")) {
            const name = routeSegment.slice(1) || "*";

            try {
                pathParams[name] = pathSegments.slice(index)
                    .map(segment => decodeURIComponent(segment))
                    .join("/");
            } catch {
                throw new NoctisError(400);
            }
            return pathParams;
        }

        const pathSegment = pathSegments[index];
        if (pathSegment === undefined) return null;

        if (routeSegment.startsWith(":")) {
            const name = routeSegment.slice(1);
            if (!name) return null;

            try {
                pathParams[name] = decodeURIComponent(pathSegment);
            } catch {
                throw new NoctisError(400);
            }
            continue;
        }

        if (routeSegment !== pathSegment) return null;
    }

    return pathParams;
};

const getContentType = (response: any) => {
    if (Buffer.isBuffer(response)) return detectBufferMimeType(response);

    let type = "text/plain";

    switch (typeof response) {
        case "string":
            if (response.startsWith("<")) {
                type = "text/html";
                break;
            }
            break;
        case "object":
            if (response !== null && !(response instanceof Uint8Array)) {
                type = "application/json";
                break;
            }
            response = String(response);
            break;
        case "function":
            response = response.toString();
            break;
        default:
            response = String(response);
            break;
    }

    return type;
}

const getResponseBody = (response: any, contentType: string) => {
    if (contentType === "application/json" && typeof response !== "string") {
        return JSON.stringify(response);
    }
    if (typeof response === "string" || response instanceof Uint8Array) return response;
    if (!response) return null;
    return String(response);
};

function* bufferChunks(buffer: Buffer, chunkSize = 64 * 1024) {
    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        yield buffer.subarray(offset, offset + chunkSize);
    }
}

export default class Noctis {
    private _server!: HTTPServer;
    private _handlers: HandlerInfo[] = [];

    /**
     * Noctis의 새 인스턴스를 만듭니다.
     *
     * @param config Noctis 서버 설정
     */
    constructor(public config: NoctisConfig) {
        const handler: ServerHandler = async (req, res) => {
            try {
                const { url, method, headers } = req;
                if (!url || !method || !headers) {
                    throw new Error("Cannot spectify url, method or headers");
                }
                const now = usNow();

                const requestUrl = new URL(url, `${config.https ? "https" : "http"}://${headers.host ?? "localhost"}`);
                const methodHandlers = this._handlers.filter(v => v.method === "any" || v.method.toLowerCase() === method.toLowerCase());
                const orderedHandlers = [
                    ...methodHandlers.filter(v => !v.path.split("/").some(segment => segment.startsWith(":") || segment.startsWith("*"))),
                    ...methodHandlers.filter(v => v.path.split("/").some(segment => segment.startsWith(":") || segment.startsWith("*")))
                ];

                let found: MatchedHandler | undefined;
                for (const routeHandler of orderedHandlers) {
                    const pathParams = matchRoute(routeHandler.path, requestUrl.pathname);
                    if (pathParams !== null) {
                        found = { ...routeHandler, pathParams };
                        break;
                    }
                }

                if (!found) {
                    config.routeHandled?.({ "route": url, "status": 404, "time": usNow() - now });
                    res.statusCode = 404;
                    const resp = config.responseNotFound ? config.responseNotFound(url) : "Not Found";
                    const type = getContentType(resp);
                    res.setHeader("Content-Type", type);
                    return res.end(getResponseBody(resp, type));
                }

                const body: Uint8Array[] = [];
                req.on("data", (chunk) => body.push(chunk));
                await new Promise(r => req.on("end", r));

                const rawBody = Buffer.concat(body);

                const response = await found.cb({
                    "formData": async () => {
                        const contentType = headers["content-type"];
                        const isFormData = contentType?.startsWith("multipart/form-data")
                            || contentType?.startsWith("application/x-www-form-urlencoded");

                        if (!contentType || !isFormData) {
                            throw new NoctisError(415);
                        }

                        try {
                            return await new Response(rawBody, {
                                "headers": { "Content-Type": contentType }
                            }).formData();
                        } catch {
                            throw new NoctisError(400);
                        }
                    },
                    "urlEncoded": async () => {
                        const params = new URLSearchParams(rawBody.toString());
                        return Object.fromEntries(params.entries());
                    },
                    "json": async () => {
                        try {
                            return JSON.parse(rawBody.toString());
                        } catch {
                            throw new NoctisError(400);
                        }
                    },
                    "text": async () => rawBody.toString(),
                    "pathParams": found.pathParams,
                    "requestHeaders": Object.fromEntries(
                        Object.entries(headers).flatMap(([key, value]) => {
                            if (value === undefined) return [];
                            return [[key, Array.isArray(value) ? value.join(", ") : value]];
                        })
                    ),
                    "ip": req.socket.remoteAddress ?? "",
                    "url": requestUrl,
                    "cookies": Object.fromEntries(
                        (headers.cookie ?? "").split(";").flatMap(value => {
                            const separator = value.indexOf("=");
                            if (separator === -1) return [];

                            const name = value.slice(0, separator).trim();
                            const cookieValue = value.slice(separator + 1).trim();
                            if (!name) return [];

                            return [[name, { name, "value": decodeURIComponent(cookieValue) }]];
                        })
                    ),
                    "method": method.toLowerCase(),
                    "headers": responseHeaders => {
                        for (const [name, value] of Object.entries(responseHeaders)) {
                            res.setHeader(name, value);
                        }
                    }
                });

                if (response === undefined || response === null) {
                    if (config.autoNoContent !== false) res.statusCode = 204;
                    config.routeHandled?.({ "route": url, "status": res.statusCode, "time": usNow() - now });
                    return res.end();
                }

                const type = getContentType(response);
                if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", type);

                if (Buffer.isBuffer(response)) {
                    if (!res.hasHeader("Content-Length")) {
                        res.setHeader("Content-Length", String(response.length));
                    }
                    await pipeline(Readable.from(bufferChunks(response)), res);
                    config.routeHandled?.({ "route": url, "status": res.statusCode, "time": usNow() - now });
                    return;
                }

                config.routeHandled?.({ "route": url, "status": res.statusCode, "time": usNow() - now });
                return res.end(getResponseBody(response, type));
            } catch (err) {
                if (NoctisError.is(err)) {
                    res.statusCode = err.statusCode;
                    const resp = err.getResponse();
                    const type = getContentType(resp);
                    res.setHeader("Content-Type", type);
                    return res.end(getResponseBody(resp, type));
                }
                throw err;
            }
        };

        this._server = createServer(handler, Boolean(config.https), config.https?.cert, config.https?.key);
    }

    /**
     * 서버를 엽니다.
     *
     * @returns 서버가 열릴 때 까지 기다리는 Promise
     */
    listen() {
        return new Promise<void>((resolve, reject) => {
            try {
                this._server.listen(this.config.port ?? 3000, resolve);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * 모든 메서드의 요청을 받습니다.
     */
    any: NoctisRouteHandler = (route, handler) => {
        this._handlers.push({
            "path": route,
            "method": "any",
            "cb": handler
        });
    }
}
