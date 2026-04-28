import fs from "node:fs";
import path from "node:path";
import { CORE_PACKAGE_NAME_RE } from "./package-naming.ts";

function toPosixRel(repoRoot: string, absPath: string) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}

/**
 * Packages named `@core/<feature>` under `features/{feature}/core/`.
 */
export function getRepoCorePackageChoices(
  repoRoot: string
): { name: string; value: string }[] {
  const featuresDir = path.join(repoRoot, "features");
  if (!fs.existsSync(featuresDir)) {
    return [];
  }
  const out: { name: string; value: string }[] = [];
  for (const entry of fs.readdirSync(featuresDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgJsonPath = path.join(
      featuresDir,
      entry.name,
      "core",
      "package.json"
    );
    if (!fs.existsSync(pkgJsonPath)) continue;
    let pkgName: string;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as {
        name?: string;
      };
      pkgName = String(pkg.name ?? "");
    } catch {
      continue;
    }
    if (!CORE_PACKAGE_NAME_RE.test(pkgName)) continue;
    const pkgRoot = path.dirname(pkgJsonPath);
    const rel = toPosixRel(repoRoot, pkgRoot);
    out.push({
      name: `${pkgName} - ${rel}`,
      value: rel,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function readCorePackageJsonName(
  repoRoot: string,
  pkgRel: string
): string {
  const pkgJsonPath = path.join(repoRoot, ...pkgRel.split("/"), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as {
    name?: string;
  };
  return String(pkg.name ?? "");
}
