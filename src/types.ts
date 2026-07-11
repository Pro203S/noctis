type Headers = Record<string, string>;
type SearchParams = Record<string, string>;
type Cookie = {
    "name": string,
    "value": string,
    "expires"?: Date,
    "maxAge"?: number,
    "domain"?: string,
    "path"?: string,
    "secure"?: boolean,
    "httpOnly"?: string,
    "sameSite"?: boolean | "lax" | "strict" | "none";
    "priority"?: "low" | "medium" | "high",
    "partitioned"?: boolean
};
type Cookies = Record<string, Cookie>;

/**
 * Server Config.
 */
export type NoctisConfig = Partial<{
    "https": {
        "keyPath": string,
        "certPath": string
    },
    "port": number,
    "routeHandled": (ev: {
        "route": string,
        "status": number,
        /** microseconds */
        "time": number
    }) => any,
    "unhandledRouteError": (route: string, err: Error) => any,
    "autoNoContent": boolean
}>;

export type NoctisRouteParameters = {
    "formData": () => Promise<FormData>;
    "urlEncoded": () => Promise<SearchParams>;
    "json": () => Promise<any>;
    "text": () => Promise<string>;
    "pathParams": Record<string, string>;

    "requestHeaders": Headers,
    "ip": string,
    "url": URL,
    "cookies": Cookies

    "status": (status: number) => any;
    "headers": (headers: Headers) => any;
};