import NoctisError from "../lib/noctisError";
import usNow from "../lib/us";
import type { HTTPServer, ServerHandler } from "../server/creator";
import createServer from "../server/creator";
import type { HandlerInfo, MatchedHandler, NoctisConfig, NoctisMiddlewareCallback, NoctisRouteHandler, NoctisRouteHandlerCallback } from "../types";
import RouteContext from "./routeContext";
import { getRequestPath, writeResponse, readBody, isPromiseLike, matchDynamicRoute, compileRoute, normalizePath } from "./utils";

export default class Noctis {
    private _server!: HTTPServer;
    private _staticHandlers = new Map<string, HandlerInfo[]>();
    private _dynamicHandlers: HandlerInfo[] = [];
    private _middlewares: NoctisMiddlewareCallback[] = [];

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

                if (!found && this._middlewares.length === 0) {
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
                    found?.pathParams ?? {},
                    normalizedMethod,
                    url,
                    secure
                );
                const finalHandler = () => {
                    if (found) return found.handler.cb(context);

                    res.statusCode = 404;
                    return config.responseNotFound ? config.responseNotFound(url) : "Not Found";
                };
                const result = this._middlewares.length === 0
                    ? finalHandler()
                    : this._runMiddlewares(context, finalHandler);
                const response = isPromiseLike(result) ? await result : result;

                if (!res.writableEnded) {
                    if (response === undefined || response === null) {
                        if (found && config.autoNoContent !== false) res.statusCode = 204;
                        res.end();
                    } else {
                        writeResponse(res, response);
                    }
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

    private _runMiddlewares(context: RouteContext, finalHandler: () => any) {
        const dispatch = (index: number): any => {
            const middleware = this._middlewares[index];
            if (!middleware) return finalHandler();

            let nextCalled = false;
            let nextResult: any;
            const next = () => {
                if (nextCalled) return nextResult;
                nextCalled = true;
                nextResult = dispatch(index + 1);

                if (isPromiseLike(nextResult)) {
                    nextResult = Promise.resolve(nextResult).finally(() => context.setNext(next));
                } else {
                    context.setNext(next);
                }
                return nextResult;
            };

            context.setNext(next);
            const result = middleware(context);
            if (isPromiseLike(result)) {
                return Promise.resolve(result).then(value => {
                    return value === undefined && nextCalled ? nextResult : value;
                });
            }
            return result === undefined && nextCalled ? nextResult : result;
        };

        return dispatch(0);
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

    /** 미들웨어를 하나 추가합니다. */
    use(handler: NoctisMiddlewareCallback) {
        this._middlewares.push(handler);
    }

    /** 모든 메서드의 요청을 받습니다. */
    any: NoctisRouteHandler = (route, handler) => {
        this._register("any", route, handler);
    }

    /** GET 메서드의 핸들러를 등록합니다. */
    get: NoctisRouteHandler = (route, handler) => {
        this._register("get", route, handler);
    }

    /** POST 메서드의 핸들러를 등록합니다. */
    post: NoctisRouteHandler = (route, handler) => {
        this._register("post", route, handler);
    }

    /** PUT 메서드의 핸들러를 등록합니다. */
    put: NoctisRouteHandler = (route, handler) => {
        this._register("put", route, handler);
    }

    /** DELETE 메서드의 핸들러를 등록합니다. */
    delete: NoctisRouteHandler = (route, handler) => {
        this._register("delete", route, handler);
    }

    /** PATCH 메서드의 핸들러를 등록합니다. */
    patch: NoctisRouteHandler = (route, handler) => {
        this._register("patch", route, handler);
    }
}
