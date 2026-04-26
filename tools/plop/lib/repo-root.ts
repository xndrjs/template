import path from "node:path";
import { fileURLToPath } from "node:url";

const libDir = path.dirname(fileURLToPath(import.meta.url));

/** Monorepo root (`tools/plop/lib` → `tools/plop` → `tools` → repo). */
export function getRepoRoot(): string {
  return path.join(libDir, "..", "..", "..");
}
