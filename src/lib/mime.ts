import path from "node:path";

const MIME_TYPES: Readonly<Record<string, string>> = {
    ".avif": "image/avif",
    ".bin": "application/octet-stream",
    ".bmp": "image/bmp",
    ".css": "text/css; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".eot": "application/vnd.ms-fontobject",
    ".gif": "image/gif",
    ".gz": "application/gzip",
    ".htm": "text/html; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".ogg": "audio/ogg",
    ".ogv": "video/ogg",
    ".otf": "font/otf",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".tar": "application/x-tar",
    ".txt": "text/plain; charset=utf-8",
    ".wasm": "application/wasm",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".xml": "application/xml; charset=utf-8",
    ".zip": "application/zip"
};

export const getMimeType = (filePath: string) => {
    return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
};

const startsWith = (buffer: Buffer, bytes: readonly number[]) => {
    return bytes.every((byte, index) => buffer[index] === byte);
};

export const detectBufferMimeType = (buffer: Buffer) => {
    if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
    if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
    if (buffer.subarray(0, 6).toString("ascii") === "GIF87a"
        || buffer.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
    if (buffer.subarray(0, 4).toString("ascii") === "RIFF"
        && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
    if (buffer.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
    if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return "application/zip";
    if (startsWith(buffer, [0x1f, 0x8b])) return "application/gzip";
    if (startsWith(buffer, [0x00, 0x61, 0x73, 0x6d])) return "application/wasm";

    const text = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8");
    if (!text.includes("\uFFFD") && !text.includes("\0")) {
        const trimmed = text.trimStart();
        if (/^<!doctype html\b/i.test(trimmed) || /^<html\b/i.test(trimmed)) {
            return "text/html; charset=utf-8";
        }
        if (/^<svg\b/i.test(trimmed)) return "image/svg+xml; charset=utf-8";
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "application/json; charset=utf-8";
        return "text/plain; charset=utf-8";
    }

    return "application/octet-stream";
};
