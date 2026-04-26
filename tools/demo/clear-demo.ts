/**
 * Removes demo scaffold: `features/demo/` and the smoke-test app `apps/demo-web/`
 * (depends on `@features/demo-composition-web` from that tree).
 *
 * Usage (from repo root):
 *   pnpm demo:clear
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const toRemove: { abs: string; label: string }[] = [
  { abs: path.join(repoRoot, "features", "demo"), label: "features/demo" },
  { abs: path.join(repoRoot, "apps", "demo-web"), label: "apps/demo-web" },
];

let removed = false;
for (const { abs, label } of toRemove) {
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { recursive: true, force: true });
    console.log(`Removed ${label}.`);
    removed = true;
  }
}

if (!removed) {
  console.log(
    "Nothing to remove: features/demo and apps/demo-web are already absent."
  );
} else {
  console.log(
    "Run `pnpm install` if you want the lockfile/workspace graph refreshed."
  );
}
