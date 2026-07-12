import { IncomingMessage, ServerResponse } from "node:http";
import { detectBufferMimeType } from "../lib/mime";
import NoctisError from "../lib/noctisError";
import { HandlerInfo, NoctisRouteHandlerCallback, RouteToken } from "../types";

const EMPTY_BODY = Buffer.alloc(0);

export const normalizePath = (pathname: string) => {
    if (pathname === "/") return pathname;
    if (!pathname.includes("//") && !pathname.endsWith("/")) return pathname;

    const segments = pathname.split("/").filter(Boolean);
    return segments.length === 0 ? "/" : `/${segments.join("/")}`;
};

export const getRequestPath = (url: string, secure: boolean, host: string | undefined) => {
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

export const compileRoute = (path: string, method: string, cb: NoctisRouteHandlerCallback): HandlerInfo => {
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

export const matchDynamicRoute = (handler: HandlerInfo, pathSegments: readonly string[]) => {
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

export const readBody = (req: IncomingMessage) => {
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

export const writeResponse = (res: ServerResponse, response: any) => {
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

export const isPromiseLike = (value: any): value is PromiseLike<any> => {
    return value !== null && (typeof value === "object" || typeof value === "function")
        && typeof value.then === "function";
};