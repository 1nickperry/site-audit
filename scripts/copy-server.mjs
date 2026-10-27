import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });
cpSync(join(root, "server.js"), join(dist, "server.js"));
cpSync(join(root, "server"), join(dist, "server"), { recursive: true });
cpSync(join(root, "package.json"), join(dist, "package.json"));
