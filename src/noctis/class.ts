import type { IncomingMessage, ServerResponse } from "node:http";
import { detectBufferMimeType } from "../lib/mime";
import NoctisError from "../lib/noctisError";
import usNow from "../lib/us";
import type { HTTPServer, ServerHandler } from "../server/creator";
import createServer from "../server/creator";
import type { NoctisConfig, NoctisRouteHandler, NoctisRouteHandlerCallback, NoctisRouteParameters } from "../types";

type RouteToken = readonly [type: 0 | 1 | 2, value: string];

type HandlerInfo = {
    "cb": NoctisRouteHandlerCallback,
    "method": string,
    "path": string,
    "tokens": readonly RouteToken[],
    "wildcard": boolean,
    "valid": boolean
};

type MatchedHandler = {
    "handler": HandlerInfo,
    "pathParams": Record<string, string>
};

const EMPTY_BODY = Buffer.alloc(0);

const normalizePath = (pathname: string) => {
    if (pathname === "/") return pathname;
    if (!pathname.includes("//") && !pathname.endsWith("/")) return pathname;

    const segments = pathname.split("/").filter(Boolean);
    return segments.length === 0 ? "/" : `/${segments.join("/")}`;
};

const getRequestPath = (url: string, secure: boolean, host: string | undefined) => {
    const queryIndex = url.indexOf("?");
    const rawPath = queryIndex === -1 ? url : url.slice(0, queryIndex);

    // WHATWG URL parsing is required for absolute-form targets and dot-segment normalization.
    const mayContainDotSegment = (rawPath.includes("/.") || rawPath.includes("%"))
        && /(?:^|\/)(?:\.{1,2}|%2e)/i.test(rawPath);
    if (!rawPath.startsWith("/") || mayContainDotSegment) {
        return normalizePath(new URL(url, `${secure ? "https" : "http"}://${host ?? "localhost"}`).pathname);
    }

    return normalizePath(rawPath);
};

const compileRoute = (path: string, method: string, cb: NoctisRouteHandlerCallback): HandlerInfo => {
    const segments = path.split("/").filter(Boolean);
    const tokens: RouteToken[] = [];
    let wildcard = false;
    let valid = true;

    for (let index = 0; index < segments.length; index++) {
        const segment = segments[index]!;
        const prefix = segment.charCodeAt(0);

        if (prefix === 58) {
            const name = segment.slice(1);
            if (!name) valid = false;
            tokens.push([1, name]);
        } else if (prefix === 42) {
            const name = segment.slice(1) || "*";
            wildcard = true;
            if (index !== segments.length - 1) valid = false;
            tokens.push([2, name]);
        } else {
            tokens.push([0, segment]);
        }
    }

    return { cb, method: method.toLowerCase(), path, tokens, wildcard, valid };
};

const matchDynamicRoute = (handler: HandlerInfo, pathSegments: readonly string[]) => {
    if (!handler.valid) return null;
    if (handler.wildcard) {
        if (pathSegments.length < handler.tokens.length - 1) return null;
    } else if (pathSegments.length !== handler.tokens.length) {
        return null;
    }

    const pathParams: Record<string, string> = {};

    for (let index = 0; index < handler.tokens.length; index++) {
        const [type, value] = handler.tokens[index]!;
        const pathSegment = pathSegments[index];

        if (type === 2) {
            const remaining: string[] = [];
            try {
                for (let offset = index; offset < pathSegments.length; offset++) {
                    remaining.push(decodeURIComponent(pathSegments[offset]!));
                }
            } catch {
                throw new NoctisError(400);
            }
            pathParams[value] = remaining.join("/");
            return pathParams;
        }

        if (pathSegment === undefined) return null;
        if (type === 0) {
            if (value !== pathSegment) return null;
            continue;
        }

        try {
            pathParams[value] = decodeURIComponent(pathSegment);
        } catch {
            throw new NoctisError(400);
        }
    }

    return pathParams;
};

const readBody = (req: IncomingMessage) => {
    const contentLength = req.headers["content-length"];
    if ((!contentLength || contentLength === "0") && req.headers["transfer-encoding"] === undefined) {
        return EMPTY_BODY;
    }

    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Uint8Array[] = [];

        req.on("data", (chunk: Uint8Array) => chunks.push(chunk));
        req.once("end", () => {
            if (chunks.length === 0) resolve(EMPTY_BODY);
            else if (chunks.length === 1) {
                const chunk = chunks[0]!;
                resolve(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            } else resolve(Buffer.concat(chunks));
        });
        req.once("aborted", () => reject(new NoctisError(400)));
        req.once("error", reject);
    });
};

class RouteContext implements NoctisRouteParameters {
    private _headers?: NoctisRouteParameters["headers"];
    private _cookies?: NoctisRouteParameters["cookies"];
    private _url?: URL;
    private _formDataCallback?: NoctisRouteParameters["formData"];
    private _urlEncodedCallback?: NoctisRouteParameters["urlEncoded"];
    private _jsonCallback?: NoctisRouteParameters["json"];
    private _textCallback?: NoctisRouteParameters["text"];
    private _setHeadersCallback?: NoctisRouteParameters["setHeaders"];

    constructor(
        private readonly req: IncomingMessage,
        private readonly res: ServerResponse,
        private readonly rawBody: Buffer,
        public readonly pathParams: Record<string, string>,
        public readonly method: string,
        private readonly requestUrl: string,
        private readonly secure: boolean
    ) { }

    get formData() {
        return this._formDataCallback ??= this._parseFormData.bind(this);
    }

    private async _parseFormData() {
        const contentType = this.req.headers["content-type"];
        const supported = contentType?.startsWith("multipart/form-data")
            || contentType?.startsWith("application/x-www-form-urlencoded");
        if (!contentType || !supported) throw new NoctisError(415);

        try {
            return await new Response(this.rawBody as unknown as BodyInit, {
                "headers": { "Content-Type": contentType }
            }).formData();
        } catch {
            throw new NoctisError(400);
        }
    }

    get urlEncoded() {
        return this._urlEncodedCallback ??= this._parseUrlEncoded.bind(this);
    }

    private async _parseUrlEncoded() {
        return Object.fromEntries(new URLSearchParams(this.rawBody.toString()));
    }

    get json() {
        return this._jsonCallback ??= this._parseJson.bind(this);
    }

    private async _parseJson() {
        try {
            return JSON.parse(this.rawBody.toString());
        } catch {
            throw new NoctisError(400);
        }
    }

    get text() {
        return this._textCallback ??= this._parseText.bind(this);
    }

    private async _parseText() {
        return this.rawBody.toString();
    }

    get headers() {
        if (this._headers) return this._headers;

        const normalized: Record<string, string> = {};
        for (const name in this.req.headers) {
            const value = this.req.headers[name];
            if (value !== undefined) normalized[name] = Array.isArray(value) ? value.join(", ") : value;
        }
        return this._headers = normalized;
    }

    get ip() {
        return this.req.socket.remoteAddress ?? "";
    }

    get url() {
        return this._url ??= new URL(
            this.requestUrl,
            `${this.secure ? "https" : "http"}://${this.req.headers.host ?? "localhost"}`
        );
    }

    get cookies() {
        if (this._cookies) return this._cookies;

        const cookies: NoctisRouteParameters["cookies"] = {};
        const header = this.req.headers.cookie;
        if (header) {
            const values = header.split(";");
            for (let index = 0; index < values.length; index++) {
                const value = values[index]!;
                const separator = value.indexOf("=");
                if (separator === -1) continue;

                const name = value.slice(0, separator).trim();
                if (!name) continue;
                cookies[name] = {
                    name,
                    "value": decodeURIComponent(value.slice(separator + 1).trim())
                };
            }
        }
        return this._cookies = cookies;
    }

    get setHeaders() {
        return this._setHeadersCallback ??= this._setHeaders.bind(this);
    }

    private _setHeaders(headers: NoctisRouteParameters["headers"]) {
        for (const name in headers) this.res.setHeader(name, headers[name]!);
    }
}

const writeResponse = (res: ServerResponse, response: any) => {
    if (Buffer.isBuffer(response)) {
        if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", detectBufferMimeType(response));
        if (!res.hasHeader("Content-Length")) res.setHeader("Content-Length", response.length);
        res.end(response);
        return;
    }

    if (typeof response === "string") {
        if (!res.hasHeader("Content-Type")) {
            res.setHeader("Content-Type", response.startsWith("<") ? "text/html" : "text/plain");
        }
        res.end(response);
        return;
    }

    if (response === null || response === undefined) {
        res.end();
        return;
    }

    if (response instanceof Uint8Array) {
        if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", "application/octet-stream");
        res.end(response);
        return;
    }

    if (typeof response === "object") {
        if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(response));
        return;
    }

    if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", "text/plain");
    res.end(String(response));
};

const isPromiseLike = (value: any): value is PromiseLike<any> => {
    return value !== null && (typeof value === "object" || typeof value === "function")
        && typeof value.then === "function";
};

export default class Noctis {
    private _server!: HTTPServer;
    private _staticHandlers = new Map<string, HandlerInfo[]>();
    private _dynamicHandlers: HandlerInfo[] = [];

    /**
     * Noctis의 새 인스턴스를 만듭니다.
     *
     * @param config Noctis 서버 설정
     */
    constructor(public config: NoctisConfig) {
        const secure = Boolean(config.https);
        const onHandled = config.routeHandled;

        const handler: ServerHandler = async (req, res) => {
            try {
                const { url, method, headers } = req;
                if (!url || !method) throw new Error("Cannot specify URL or method");

                const startedAt = onHandled ? usNow() : 0;
                const normalizedMethod = method.toLowerCase();
                const pathname = getRequestPath(url, secure, headers.host);
                const found = this._findHandler(pathname, normalizedMethod);

                if (!found) {
                    res.statusCode = 404;
                    const response = config.responseNotFound ? config.responseNotFound(url) : "Not Found";
                    writeResponse(res, response);
                    onHandled?.({ "route": url, "status": 404, "time": usNow() - startedAt });
                    return;
                }

                const body = readBody(req);
                const rawBody = Buffer.isBuffer(body) ? body : await body;
                const context = new RouteContext(
                    req,
                    res,
                    rawBody,
                    found.pathParams,
                    normalizedMethod,
                    url,
                    secure
                );
                const result = found.handler.cb(context);
                const response = isPromiseLike(result) ? await result : result;

                if (response === undefined || response === null) {
                    if (config.autoNoContent !== false) res.statusCode = 204;
                    res.end();
                } else {
                    writeResponse(res, response);
                }

                onHandled?.({ "route": url, "status": res.statusCode, "time": usNow() - startedAt });
            } catch (error) {
                if (NoctisError.is(error)) {
                    res.statusCode = error.statusCode;
                    writeResponse(res, error.getResponse());
                    return;
                }
                throw error;
            }
        };

        this._server = createServer(handler, secure, config.https?.key, config.https?.cert);
    }

    private _findHandler(pathname: string, method: string): MatchedHandler | undefined {
        const staticHandlers = this._staticHandlers.get(pathname);
        if (staticHandlers) {
            for (let index = 0; index < staticHandlers.length; index++) {
                const handler = staticHandlers[index]!;
                if (handler.method === "any" || handler.method === method) {
                    return { handler, "pathParams": {} };
                }
            }
        }

        if (this._dynamicHandlers.length === 0) return;
        const pathSegments = pathname.split("/").filter(Boolean);

        for (let index = 0; index < this._dynamicHandlers.length; index++) {
            const handler = this._dynamicHandlers[index]!;
            if (handler.method !== "any" && handler.method !== method) continue;

            const pathParams = matchDynamicRoute(handler, pathSegments);
            if (pathParams !== null) return { handler, pathParams };
        }
    }

    private _register(method: string, path: string, callback: NoctisRouteHandlerCallback) {
        const handler = compileRoute(path, method, callback);
        const dynamic = handler.tokens.some(([type]) => type !== 0);

        if (dynamic) {
            this._dynamicHandlers.push(handler);
            return;
        }

        const normalizedPath = normalizePath(path);
        const handlers = this._staticHandlers.get(normalizedPath);
        if (handlers) handlers.push(handler);
        else this._staticHandlers.set(normalizedPath, [handler]);
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
            } catch (error) {
                reject(error);
            }
        });
    }

    /** 모든 메서드의 요청을 받습니다. */
    any: NoctisRouteHandler = (route, handler) => {
        this._register("any", route, handler);
    }
}
