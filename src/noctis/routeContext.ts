import type { IncomingMessage, ServerResponse } from "node:http";
import NoctisError from "../lib/noctisError";
import type { NoctisRouteParameters } from "../types";

export default class RouteContext implements NoctisRouteParameters {
    private _headers?: NoctisRouteParameters["headers"];
    private _cookies?: NoctisRouteParameters["cookies"];
    private _url?: URL;
    private _formDataCallback?: NoctisRouteParameters["formData"];
    private _urlEncodedCallback?: NoctisRouteParameters["urlEncoded"];
    private _jsonCallback?: NoctisRouteParameters["json"];
    private _textCallback?: NoctisRouteParameters["text"];
    private _setHeadersCallback?: NoctisRouteParameters["setHeaders"];
    private _redirectCallback?: NoctisRouteParameters["redirect"];
    private _nextCallback: () => any = () => undefined;

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

    get redirect() {
        return this._redirectCallback ??= this._redirect.bind(this);
    }

    private _redirect(url: string) {
        this.res.setHeader("Location", url);
        this.res.writeHead(307);
        this.res.end();
    }

    /** The next middleware callback for the current dispatch step. */
    get next() {
        return this._nextCallback;
    }

    /** @internal */
    setNext(callback: () => any) {
        this._nextCallback = callback;
    }
}
