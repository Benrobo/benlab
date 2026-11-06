import { createServer } from "vite";
import { startEngine } from "./engine/server";

await startEngine();

const vite = await createServer();
await vite.listen();
vite.printUrls();
