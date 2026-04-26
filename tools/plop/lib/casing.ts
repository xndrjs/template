/**
 * Insert spaces at word boundaries so camelCase / PascalCase / "HTTPClient" style names split correctly.
 */
function normalizeWordBoundaries(str: string) {
  return String(str)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}
function splitNameSegments(value: unknown) {
  return normalizeWordBoundaries(String(value ?? ""))
    .split(/[\s\-_/]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
function toKebabCase(value: unknown) {
  return splitNameSegments(value)
    .map((part) => part.toLowerCase())
    .join("-");
}
function toPascalCase(value: unknown) {
  return splitNameSegments(value)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}
function lowerFirst(value: unknown) {
  const s = String(value).trim();
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
function toCamelCase(value: unknown) {
  return lowerFirst(toPascalCase(value));
}
function toConstantCase(value: unknown) {
  return toKebabCase(value).toUpperCase().replace(/-/g, "_");
}
/**
 * Minimal parser for `export interface Name { method(...): T; }` method lines (single-line signatures).
 */
function parseInterfaceMethods(source: string, interfaceName: string) {
  const ifaceDecl = `export interface ${interfaceName}`;
  const start = source.indexOf(ifaceDecl);
  if (start === -1) {
    throw new Error(`Interface ${interfaceName} not found in port file`);
  }
  const braceStart = source.indexOf("{", start);
  if (braceStart === -1) {
    throw new Error(`Cannot find body for interface ${interfaceName}`);
  }
  let braceDepth = 1;
  let i = braceStart + 1;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") braceDepth++;
    else if (ch === "}") braceDepth--;
    if (braceDepth === 0) break;
  }
  const body = source.slice(braceStart + 1, i);
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"));
  const methods: { name: string; params: string; returnType: string }[] = [];
  for (const line of lines) {
    const match = line.match(/^(\w+)\(([^)]*)\):\s*([^;{]+);?$/);
    if (!match) continue;
    const name = match[1];
    const params = match[2];
    const returnType = match[3];
    if (name === undefined || params === undefined || returnType === undefined)
      continue;
    methods.push({
      name,
      params: params.trim(),
      returnType: returnType.trim(),
    });
  }
  return methods;
}
/**
 * First `export interface Name {` in a source file (used for repository ports where the
 * interface name is not derivable from the filename alone).
 */
function parseExportedInterfaceName(source: string): string | null {
  const m = source.match(/export\s+interface\s+(\w+)\s*\{/m);
  return m?.[1] ?? null;
}
export {
  toKebabCase,
  toPascalCase,
  lowerFirst,
  toCamelCase,
  toConstantCase,
  parseInterfaceMethods,
  parseExportedInterfaceName,
};
