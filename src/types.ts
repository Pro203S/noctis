/** Common HTTP headers. */
type BasicHeaders = Partial<{
    "accept": string;
    "accept-encoding": string;
    "accept-language": string;
    "authorization": string;
    "cache-control": string;
    "connection": string;
    "content-length": string;
    "content-type": string;
    "cookie": string;
    "host": string;
    "origin": string;
    "referer": string;
    "user-agent": string;
}>;

/** HTTP headers represented as name-value pairs. */
type Headers = BasicHeaders & Record<string, string>;

/** URL search parameters represented as name-value pairs. */
type SearchParams = Record<string, string>;

/** Describes an HTTP cookie and its attributes. */
type Cookie = {
    /** The cookie name. */
    "name": string,
    /** The cookie value. */
    "value": string
};

/** Cookies represented as name-cookie pairs. */
type Cookies = Record<string, Cookie>;

/**
 * Configures a Noctis server.
 */
export type NoctisConfig = Partial<{
    /** Configures HTTPS for the server. */
    "https": {
        /** The private key contents, not a file path. */
        "key": string,
        /** The certificate contents, not a file path. */
        "cert": string
    },
    /** The port on which the server listens. */
    "port": number,
    /** Called after a route has been handled. */
    "routeHandled": (ev: {
        /** The route that handled the request. */
        "route": string,
        /** The HTTP response status code. */
        "status": number,
        /** The route handling time, in microseconds. */
        "time": number
    }) => any,
    /** 루트를 핸들 중 오류가 발생했을 때 호출되는 콜백입니다. */
    "unhandledRouteError": (route: string, err: Error) => any,
    /** Whether routes that return no value automatically respond with status 204. */
    "autoNoContent": boolean,
    /** 없는 루트에 접근했을 때 반환할 body입니다. */
    "responseNotFound": (path: string) => any;
    /** 없는 메서드에 접근했을 때 반환할 body입니다. */
    "responseMethodNotAllowed": (path: string) => any;
}>;

/** Values and response helpers provided to a route handler. */
export type NoctisRouteParameters = {
    /** Parses the request body as form data. */
    "formData": () => Promise<FormData>;
    /** Parses the request body as URL-encoded search parameters. */
    "urlEncoded": () => Promise<SearchParams>;
    /** Parses the request body as JSON. */
    "json": () => Promise<any>;
    /** Parses the request body as text. */
    "text": () => Promise<string>;
    /** Parameters extracted from the route path. */
    "pathParams": Record<string, string>;

    /** Headers received with the request. */
    "requestHeaders": Headers,
    /** The client's IP address. */
    "ip": string,
    /** The request URL. */
    "url": URL,
    /** Cookies received with the request. */
    "cookies": Cookies,
    /** The request method in lower case. */
    "method": string | "get" | "post" | "put" | "delete" | "patch",

    /** Sets the HTTP response status code. */
    "status": (status: number) => any;
    /** Sets HTTP response headers. */
    "headers": (headers: Headers) => any;
};

export type NoctisRouteHandler = (route: string, handler: (params: NoctisRouteParameters) => any) => any;
export type NoctisRouteHandlerCallback = (params: NoctisRouteParameters) => any;
