import fs from "node:fs";
import path from "node:path";

function domainDir(repoRoot: string, corePackageRel: string) {
  return path.join(repoRoot, ...corePackageRel.split("/"), "domain");
}

/**
 * Repo-relative paths under `domain/` like `primitives/foo.primitive.ts`.
 */
export function listPrimitiveRelativePaths(
  repoRoot: string,
  corePackageRel: string
): string[] {
  const dir = path.join(domainDir(repoRoot, corePackageRel), "primitives");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".primitive.ts") &&
        !e.name.endsWith(".primitive.proof.ts")
    )
    .map((e) => `primitives/${e.name}`)
    .sort();
}

export function listShapeRelativePaths(
  repoRoot: string,
  corePackageRel: string
): string[] {
  const dir = path.join(domainDir(repoRoot, corePackageRel), "shapes");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".shape.ts") &&
        !e.name.endsWith(".shape.proof.ts")
    )
    .map((e) => `shapes/${e.name}`)
    .sort();
}

/** `export const Foo = domain.primitive(` or legacy `branded.primitive(` → `Foo` */
export function parsePrimitiveKitId(source: string): string | null {
  const m = source.match(
    /export\s+const\s+(\w+)\s*=\s*(?:domain|branded)\.primitive\s*\(/u
  );
  return m?.[1] ?? null;
}

/**
 * Shape kit id for proofs / prompts:
 * - `export const FooShape = domain.shape(` (or `branded.shape(`)
 * - `const FooShape = domain.shape(` (re-exported via `export { FooShape }`)
 * - legacy tuple: `const [FooShape, patchFoo] = branded.shape(`
 * - fallback: `export { FooShape }` when tuple assignment is non-exported
 */
export function parseShapeKitId(source: string): string | null {
  const kitNs = "(?:domain|branded)";

  const fromExportedConst = source.match(
    new RegExp(
      String.raw`export\s+const\s+(\w+)\s*=\s*${kitNs}\.shape\s*\(`,
      "u"
    )
  );
  if (fromExportedConst?.[1]) return fromExportedConst[1];

  const fromConst = source.match(
    new RegExp(String.raw`const\s+(\w+)\s*=\s*${kitNs}\.shape\s*\(`, "u")
  );
  if (fromConst?.[1]) return fromConst[1];

  const fromInternalTuple = source.match(
    new RegExp(
      String.raw`const\s*\[\s*(\w+)\s*,\s*\w+\s*\]\s*=\s*${kitNs}\.shape\s*\(`,
      "u"
    )
  );
  if (fromInternalTuple?.[1]) return fromInternalTuple[1];

  const fromExportedTuple = source.match(/export\s+const\s*\[\s*(\w+)\s*,/u);
  if (fromExportedTuple?.[1]) return fromExportedTuple[1];

  const fromNamedExport = source.match(/export\s*\{\s*(\w+)\s*\}\s*;/u);
  return fromNamedExport?.[1] ?? null;
}

export function importModulePathFromDomainRel(domainRelPath: string): string {
  const withoutTs = domainRelPath.replace(/\.ts$/u, "");
  return `../${withoutTs}`;
}

/**
 * Same-folder import for a proof module from its base `*.primitive.ts` / `*.shape.ts`.
 * `primitives/plop-demo-id.primitive.ts` → `./plop-demo-id.primitive`
 */
export function sameDirectoryKitImportFromDomainRelPath(
  domainRelPath: string
): string {
  const base = domainRelPath.split("/").pop();
  if (!base?.endsWith(".ts")) {
    throw new Error(`Expected domain-relative .ts path, got: ${domainRelPath}`);
  }
  return `./${base.slice(0, -3)}`;
}
