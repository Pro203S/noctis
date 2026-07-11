# 🌙 noctis

사용 예시:
```typescript
import Noctis, { NoctisError, static, next } from 'noctis';

const server = new Noctis({
    "port": 3000
});

server.middleware([
    "/",
    "/files/*",
], ({ requestHeaders }) => {
    if (!requestHeaders.authorization) throw new NoctisError(401);
    next();
});

server.get("/", static("/public"));
server.get("/not_found", () => {
    throw new NoctisError(404, { "message": "File Not Found" });
});
server.post("/file", async ({ body }) => {
    const file = await body();

    return null; // 204
});
server.get("/files/:id", async () => {
    return {
        "name": "file.txt",
        "size": 100
    };
});
server.any("/files", ({ method }) => {
    if (method === "delete") throw new NoctisError(405);

    return method;
});

(async () => {
    await server.listen();
    console.log("Server listening on port 3000");
})();
```