const ERROR_CODE_MAP: Readonly<Record<number, string>> = {
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Content Too Large",
    414: "URI Too Long",
    415: "Unsupported Media Type",
    416: "Range Not Satisfiable",
    417: "Expectation Failed",
    418: "I'm a Teapot",
    421: "Misdirected Request",
    422: "Unprocessable Content",
    423: "Locked",
    424: "Failed Dependency",
    425: "Too Early",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    451: "Unavailable For Legal Reasons",

    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    510: "Not Extended",
    511: "Network Authentication Required"
};

export default class NoctisError extends Error {
    constructor(
        public statusCode: number,
        public body?: any
    ) {
        super(`${statusCode}: ${body ?? ERROR_CODE_MAP[statusCode] ?? "Unknown Error"}`);
    }

    public getResponse() {
        if (!this.body) return { "message": ERROR_CODE_MAP[this.statusCode] ?? "Unknown Error" };
        return this.body;
    }

    /**
     * Checks whether an object is a NoctisError.
     *
     * @param error The object to check.
     * @returns True if the object is a NoctisError.
     */
    public static is(error: unknown): error is NoctisError {
        return error instanceof NoctisError;
    }
}
