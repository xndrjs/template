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
const PROOFS_REEXPORT = 'export * from "./proofs";';
const CAPABILITIES_REEXPORT = 'export * from "./capabilities";';
const SERVICES_REEXPORT = 'export * from "./services";';
export function ensureModelsIndexReexportsModelSlices(file: string): string {
  let body = file.replace(/^export\s*{\s*}\s*;?\s*$/m, "").trimEnd();
  if (!body.includes(PRIMITIVES_REEXPORT)) {
    body =
      body.length > 0 ? `${body}\n${PRIMITIVES_REEXPORT}` : PRIMITIVES_REEXPORT;
  }
  if (!body.includes(SHAPES_REEXPORT)) {
    body = `${body}\n${SHAPES_REEXPORT}`;
  }
  if (!body.includes(PROOFS_REEXPORT)) {
    body = `${body}\n${PROOFS_REEXPORT}`;
  }
  return `${body}\n`;
}

export function ensureOperationsIndexReexportsOperationSlices(
  file: string
): string {
  let body = file.replace(/^export\s*{\s*}\s*;?\s*$/m, "").trimEnd();
  if (!body.includes(CAPABILITIES_REEXPORT)) {
    body =
      body.length > 0
        ? `${body}\n${CAPABILITIES_REEXPORT}`
        : CAPABILITIES_REEXPORT;
  }
  if (!body.includes(SERVICES_REEXPORT)) {
    body = `${body}\n${SERVICES_REEXPORT}`;
  }
  return `${body}\n`;
}
