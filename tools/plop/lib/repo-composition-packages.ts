import fs from "node:fs";
import path from "node:path";
import { COMPOSITION_PACKAGE_NAME_RE } from "./package-naming.ts";

function toPosixRel(repoRoot: string, absPath: string) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}

/**
 * Packages under `features/{feature}/composition/{app}/`.
 */
export function getRepoCompositionPackageChoices(
  repoRoot: string
): { name: string; value: string }[] {
  const featuresDir = path.join(repoRoot, "features");
  if (!fs.existsSync(featuresDir)) {
    return [];
  }
  const out: { name: string; value: string }[] = [];
  for (const featureEntry of fs.readdirSync(featuresDir, {
    withFileTypes: true,
  })) {
    if (!featureEntry.isDirectory()) continue;
    const compositionRoot = path.join(
      featuresDir,
      featureEntry.name,
      "composition"
    );
    if (!fs.existsSync(compositionRoot)) continue;
    for (const appEntry of fs.readdirSync(compositionRoot, {
      withFileTypes: true,
    })) {
      if (!appEntry.isDirectory()) continue;
      const pkgJsonPath = path.join(
        compositionRoot,
        appEntry.name,
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
      if (!COMPOSITION_PACKAGE_NAME_RE.test(pkgName)) continue;
      const pkgRoot = path.dirname(pkgJsonPath);
      const rel = toPosixRel(repoRoot, pkgRoot);
      out.push({
        name: `${pkgName} — ${rel}`,
        value: rel,
      });
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
