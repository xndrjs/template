import { toCamelCase, toPascalCase } from "./casing.ts";

export interface CompositionUseCaseWire {
  /** e.g. `@core/demo` */
  corePkgName: string;
  /** kebab stem: `verify-user` from `verify-user.use-case.ts` */
  kebabStem: string;
}

function importLine(w: CompositionUseCaseWire): string {
  const pascal = toPascalCase(w.kebabStem);
  return `import { create${pascal}UseCase } from "${w.corePkgName}/use-cases";`;
}

function propertyLine(w: CompositionUseCaseWire): string {
  const pascal = toPascalCase(w.kebabStem);
  const camel = toCamelCase(pascal);
  return `${camel}: create${pascal}UseCase({}),`;
}

/**
 * After the opening `{` of `return {` in `get*Root`, find where the inner span ends and the tail
 * (from `}` through `;`) begins. Supports scaffold style `return {\n  };` and Prettier-style `return {};`.
 */
function findReturnObjectTailFrom(
  source: string,
  openInner: number
): number | null {
  const tail = source.slice(openInner);
  const multilineClose = source.indexOf("\n  };", openInner);
  const sameLineClose = tail.match(/^[\s\t]*\}/);
  if (sameLineClose && sameLineClose.index !== undefined) {
    const upToBrace = tail.slice(
      0,
      sameLineClose.index + sameLineClose[0].length
    );
    if (!upToBrace.includes("\n")) {
      return openInner + sameLineClose.index + sameLineClose[0].indexOf("}");
    }
  }
  if (multilineClose !== -1) {
    return multilineClose;
  }
  return null;
}

function insertAfterLeadingImports(source: string, linesToAdd: string): string {
  const parts = source.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < parts.length; i++) {
    const t = (parts[i] ?? "").trim();
    if (t.startsWith("import ")) {
      lastImportIdx = i;
      continue;
    }
    if (t !== "" && lastImportIdx !== -1) {
      break;
    }
  }
  if (lastImportIdx === -1) {
    return `${linesToAdd}\n${source}`;
  }
  const before = parts.slice(0, lastImportIdx + 1).join("\n");
  const after = parts.slice(lastImportIdx + 1).join("\n");
  return `${before}\n${linesToAdd}\n${after}`;
}

/**
 * Insert use-case imports and `get*Root` return entries into a composition `index.ts`
 * scaffolded by `feature-composition-app`.
 */
export function wireUseCasesIntoCompositionIndex(
  source: string,
  wires: CompositionUseCaseWire[]
): string {
  if (wires.length === 0) {
    return source;
  }

  const seen = new Set<string>();
  const unique = wires.filter((w) => {
    const k = `${w.corePkgName}\0${w.kebabStem}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const marker =
    "const _infrastructure = infrastructureProvider.getForContext(ctx);\n  return {";
  const markerIdx = source.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error(
      "Composition index.ts is missing the expected `getForContext` + `return {` block. Regenerate with feature-composition-app or wire manually."
    );
  }

  const openBraceEnd = markerIdx + marker.length;
  const tailFrom = findReturnObjectTailFrom(source, openBraceEnd);
  if (tailFrom === null) {
    throw new Error(
      "Could not find closing `};` for composition root return object (expected multiline `return { … };` or compact `return {};`)."
    );
  }

  const importLines = unique
    .map((w) => importLine(w))
    .filter((line) => !source.includes(line));
  const out =
    importLines.length > 0
      ? insertAfterLeadingImports(source, importLines.join("\n"))
      : source;

  const markerIdx2 = out.indexOf(marker);
  if (markerIdx2 === -1) {
    throw new Error("Internal error: marker lost after import injection.");
  }
  const open2 = markerIdx2 + marker.length;
  const close2 = findReturnObjectTailFrom(out, open2);
  if (close2 === null) {
    throw new Error(
      "Internal error: return close lost after import injection."
    );
  }
  const inner = out.slice(open2, close2);

  const newProps: string[] = [];
  for (const w of unique) {
    const prop = propertyLine(w);
    const camel = toCamelCase(toPascalCase(w.kebabStem));
    if (inner.includes(`${camel}:`)) {
      continue;
    }
    newProps.push(`    ${prop}`);
  }

  if (newProps.length === 0) {
    return out;
  }

  const trimmed = inner.replace(/\s+$/, "");
  let innerNew: string;
  if (!trimmed || trimmed.replace(/[\s\n]/g, "") === "") {
    innerNew = `\n${newProps.join("\n")}\n  `;
  } else {
    const needsComma = !trimmed.trimEnd().endsWith(",");
    const sep = needsComma ? ",\n" : "\n";
    innerNew = `${trimmed}${sep}${newProps.join("\n")}\n  `;
  }
  return `${out.slice(0, open2)}${innerNew}${out.slice(close2)}`;
}
