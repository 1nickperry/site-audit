import { cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
cpSync(join(root, "server.js"), join(dist, "server.js"));
cpSync(join(root, "server"), join(dist, "server"), { recursive: true });
cpSync(join(root, "package.json"), join(dist, "package.json"));
