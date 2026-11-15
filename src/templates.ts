import { readFileSync } from "node:fs";
import { join } from "node:path";
export const tpl = (name: string) => readFileSync(join(process.cwd(), "src", name), "utf8");
