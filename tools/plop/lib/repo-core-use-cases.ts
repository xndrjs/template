import fs from "node:fs";
import path from "node:path";
import { toPascalCase } from "./casing.ts";

/**
 * Kebab stem from `verify-user.use-case.ts` → choice value `verify-user`.
 */
export function getUseCaseChoicesForCore(
  repoRoot: string,
  corePackageRel: string
): { name: string; value: string }[] {
  const dir = path.join(
    repoRoot,
    ...corePackageRel.split("/"),
    "orchestration",
    "use-cases"
  );
  if (!fs.existsSync(dir)) {
    return [];
  }
  const out: { name: string; value: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".use-case.ts")) continue;
    if (entry.name === "index.ts" || entry.name.endsWith(".d.ts")) continue;
    const m = entry.name.match(/^(.+)\.use-case\.ts$/);
    if (!m?.[1]) continue;
    const kebabStem = m[1];
    const pascal = toPascalCase(kebabStem.replace(/-/g, " "));
    out.push({
      name: `${pascal} (${entry.name})`,
      value: kebabStem,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
