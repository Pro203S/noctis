/** HTTP headers represented as name-value pairs. */
type Headers = Record<string, string>;

/** URL search parameters represented as name-value pairs. */
type SearchParams = Record<string, string>;

/** Describes an HTTP cookie and its attributes. */
type Cookie = {
    /** The cookie name. */
    "name": string,
    /** The cookie value. */
    "value": string,
    /** The date and time at which the cookie expires. */
    "expires"?: Date,
    /** The cookie lifetime, in seconds. */
    "maxAge"?: number,
    /** The domain to which the cookie is sent. */
    "domain"?: string,
    /** The path to which the cookie is sent. */
    "path"?: string,
    /** Whether the cookie is sent only over secure connections. */
    "secure"?: boolean,
    /** Whether the cookie is inaccessible to client-side scripts. */
    "httpOnly"?: string,
    /** The cookie's SameSite policy. */
    "sameSite"?: boolean | "lax" | "strict" | "none";
    /** The cookie's priority. */
    "priority"?: "low" | "medium" | "high",
    /** Whether the cookie uses partitioned storage. */
    "partitioned"?: boolean
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
    /** Called when an error thrown by a route is not handled. */
    "unhandledRouteError": (route: string, err: Error) => any,
    /** Whether routes that return no value automatically respond with status 204. */
    "autoNoContent": boolean
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
