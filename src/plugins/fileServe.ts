import * as fs from "node:fs/promises";
import path from "node:path";
import NoctisError from "../lib/noctisError";
import { getMimeType } from "../lib/mime";
import type { NoctisRouteHandlerCallback } from "../types";

/**
 * 파일을 서빙합니다.
 * 
 * @param dir 루트 경로
 */
const fileServe = (dir: string): NoctisRouteHandlerCallback => {
    const root = path.resolve(dir);

    return async ({ setHeaders, pathParams }) => {
        const requestedPath = pathParams["*"] ?? Object.values(pathParams).at(-1) ?? "";
        if (requestedPath.includes("\0")) throw new NoctisError(400);

        let filePath = path.resolve(root, requestedPath);
        const relativePath = path.relative(root, filePath);
        if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
            throw new NoctisError(403);
        }

        try {
            const initialStat = await fs.stat(filePath);
            if (initialStat.isDirectory()) filePath = path.join(filePath, "index.html");

            const [rootRealPath, fileRealPath, stat] = await Promise.all([
                fs.realpath(root),
                fs.realpath(filePath),
                fs.stat(filePath)
            ]);
            const realRelativePath = path.relative(rootRealPath, fileRealPath);

            if (realRelativePath.startsWith("..") || path.isAbsolute(realRelativePath)) {
                throw new NoctisError(403);
            }
            if (!stat.isFile()) throw new NoctisError(404);

            setHeaders({
                "Content-Length": String(stat.size),
                "Content-Type": getMimeType(filePath)
            });

            return await fs.readFile(fileRealPath);
        } catch (error) {
            if (NoctisError.is(error)) throw error;
            if ((error as NodeJS.ErrnoException).code === "ENOENT"
                || (error as NodeJS.ErrnoException).code === "ENOTDIR") {
                throw new NoctisError(404);
            }
            throw error;
        }
    };
};

export default fileServe;
