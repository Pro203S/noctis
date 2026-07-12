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
    const rootRealPath = fs.realpath(root);

    const isOutsideRoot = (relativePath: string) => {
        return relativePath === ".."
            || relativePath.startsWith(`..${path.sep}`)
            || path.isAbsolute(relativePath);
    };

    return async ({ setHeaders, pathParams }) => {
        const requestedPath = pathParams["*"] ?? Object.values(pathParams).at(-1) ?? "";
        if (requestedPath.includes("\0")) throw new NoctisError(400);

        let filePath = path.resolve(root, requestedPath);
        const relativePath = path.relative(root, filePath);
        if (isOutsideRoot(relativePath)) throw new NoctisError(403);

        try {
            const initialStat = await fs.stat(filePath);
            let stat = initialStat;
            if (initialStat.isDirectory()) {
                filePath = path.join(filePath, "index.html");
                stat = await fs.stat(filePath);
            }

            const [resolvedRoot, fileRealPath] = await Promise.all([
                rootRealPath,
                fs.realpath(filePath)
            ]);
            const realRelativePath = path.relative(resolvedRoot, fileRealPath);

            if (isOutsideRoot(realRelativePath)) throw new NoctisError(403);
            if (!stat.isFile()) throw new NoctisError(404);

            const contents = await fs.readFile(fileRealPath);

            setHeaders({
                "Content-Length": String(contents.length),
                "Content-Type": getMimeType(filePath)
            });

            return contents;
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
