/**
 * Append `export * from '...'` to a slice barrel (`export {}` is replaced).
 */
export function appendExportToBarrelIndex(
  file: string,
  exportLine: string
): string {
  const cleaned = file.replace(/^export\s*{\s*}\s*;?\s*$/m, "").trimEnd();
  let next = cleaned;
  if (!next.includes(exportLine)) {
    next = next.length > 0 ? `${next}\n${exportLine}` : exportLine;
  }
  return `${next}\n`;
}

const PRIMITIVES_REEXPORT = 'export * from "./primitives";';
const SHAPES_REEXPORT = 'export * from "./shapes";';
const SERVICES_REEXPORT = 'export * from "./services";';

/**
 * Ensure `domain/index.ts` re-exports `primitives/`, `shapes/`, and `services/` barrels only.
 * Strips legacy per-file exports and old `refinements/` barrel lines.
 */
export function ensureDomainIndexReexportsDomainSlices(file: string): string {
  const withoutLegacy = file
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => {
      const t = l.trim();
      if (!t) return false;
      if (/\.branded-(primitive|shape)['"]/.test(t)) return false;
      if (/refinements\/index['"]/.test(t)) return false;
      return true;
    })
    .join("\n");

  let body = withoutLegacy.replace(/^export\s*{\s*}\s*;?\s*$/m, "").trimEnd();
  if (!body.includes(PRIMITIVES_REEXPORT)) {
    body =
      body.length > 0 ? `${body}\n${PRIMITIVES_REEXPORT}` : PRIMITIVES_REEXPORT;
  }
  if (!body.includes(SHAPES_REEXPORT)) {
    body = `${body}\n${SHAPES_REEXPORT}`;
  }
  if (!body.includes(SERVICES_REEXPORT)) {
    body = `${body}\n${SERVICES_REEXPORT}`;
  }
  return `${body}\n`;
}
