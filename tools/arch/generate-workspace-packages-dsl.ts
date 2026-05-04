/**
 * Scans workspace package.json files and emits Structurizr DSL (C4-friendly):
 * - each package → Container (name, description from package.json, technology TypeScript)
 * - each exports entry → Component inside that container
 * - workspace:* dependencies → relationships between containers
 *
 * Render: Structurizr CLI/Lite or https://structurizr.com/dsl
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");
const OUT_FILE = path.join(
  REPO_ROOT,
  "docs",
  "architecture",
  "generated",
  "workspace-packages.dsl"
);

interface PackageInfo {
  dir: string;
  relDir: string;
  name: string;
  description: string;
  exports: { subpath: string; target: string }[];
  workspaceDeps: string[];
}

function walkPackageJsonFiles(dir: string, acc: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkPackageJsonFiles(full, acc);
    else if (ent.name === "package.json") acc.push(full);
  }
}

function escapeDslString(s: string, maxLen = 400): string {
  const oneLine = s.replace(/\r?\n/g, " ").replace(/"/g, "'").trim();
  return oneLine.length > maxLen ? `${oneLine.slice(0, maxLen)}…` : oneLine;
}

function dslIdent(prefix: string, raw: string): string {
  const base = `${prefix}_${raw.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "_")}`;
  let s = base.replace(/_+/g, "_").replace(/^_|_$/g, "") || "pkg";
  if (/^[0-9]/.test(s)) s = `_${s}`;
  return s;
}

function dslViewKey(raw: string): string {
  const key = raw.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
  return key.replace(/^_|_$/g, "") || "view";
}

function inferTags(relDir: string): string[] {
  const norm = relDir.split(path.sep).join("/");
  const tags: string[] = [];
  if (norm.startsWith("features/")) {
    tags.push("feature");
    if (/\/core\/?$/.test(norm) || norm.endsWith("/core"))
      tags.push("feature-core");
    else if (norm.includes("/composition/")) tags.push("feature-composition");
    else if (norm.includes("/infrastructure/"))
      tags.push("feature-infrastructure");
  } else if (norm.startsWith("apps/")) tags.push("app");
  else if (norm.startsWith("configs/")) tags.push("config");
  else if (norm.startsWith("composition/")) tags.push("composition");
  return tags;
}

function pickExportTarget(val: unknown): string | null {
  if (typeof val === "string") return val;
  if (!val || typeof val !== "object") return null;
  const o = val as Record<string, unknown>;
  if (typeof o.import === "string") return o.import;
  if (typeof o.default === "string") return o.default;
  if (typeof o.require === "string") return o.require;
  if (typeof o.types === "string") return o.types;
  return null;
}

function flattenExports(
  exportsField: unknown
): { subpath: string; target: string }[] {
  if (exportsField == null) return [];
  if (typeof exportsField === "string") {
    return [{ subpath: ".", target: exportsField }];
  }
  if (typeof exportsField !== "object") return [];
  const out: { subpath: string; target: string }[] = [];
  for (const [key, val] of Object.entries(
    exportsField as Record<string, unknown>
  )) {
    if (!key.startsWith(".")) continue;
    const target = pickExportTarget(val);
    if (target) out.push({ subpath: key, target });
  }
  out.sort((a, b) => a.subpath.localeCompare(b.subpath));
  return out;
}

function isWorkspaceDep(version: string): boolean {
  return version.startsWith("workspace:");
}

function readPackage(filePath: string): PackageInfo | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const name = typeof json.name === "string" ? json.name : "";
  if (!name) return null;

  const dir = path.dirname(filePath);
  const relDir = path.relative(REPO_ROOT, dir);
  const description =
    typeof json.description === "string" && json.description.trim()
      ? json.description.trim()
      : "(no description in package.json)";

  const deps = {
    ...(typeof json.dependencies === "object" && json.dependencies !== null
      ? (json.dependencies as Record<string, string>)
      : {}),
    ...(typeof json.devDependencies === "object" &&
    json.devDependencies !== null
      ? (json.devDependencies as Record<string, string>)
      : {}),
  };

  const workspaceDeps = Object.entries(deps)
    .filter(([, ver]) => isWorkspaceDep(ver))
    .map(([pkg]) => pkg);

  return {
    dir,
    relDir,
    name,
    description,
    exports: flattenExports(json.exports),
    workspaceDeps,
  };
}

function buildModel(packages: PackageInfo[]): string {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const lines: string[] = [];

  lines.push("workspace {");
  lines.push("  !identifiers hierarchical");
  lines.push("");
  lines.push("  model {");
  lines.push(
    '    monorepo = softwareSystem "Monorepo" "Workspace packages (generated from package.json)." {'
  );

  for (const pkg of packages) {
    const cid = dslIdent("c", pkg.name);
    const title = escapeDslString(pkg.name, 120);
    const desc = escapeDslString(pkg.description);
    const tags = inferTags(pkg.relDir);
    const tagLine =
      tags.length > 0
        ? `\n        tags ${tags.map((t) => `"${escapeDslString(t, 80)}"`).join(" ")}`
        : "";

    lines.push(
      `      ${cid} = container "${title}" "${desc}" "TypeScript" {${tagLine}`
    );

    if (pkg.exports.length === 0) {
      lines.push(
        `        ${cid}_no_exports = component "package.json exports" "(no exports field — use package root or add exports)"`
      );
    } else {
      for (const ex of pkg.exports) {
        const compId = dslIdent(
          `${cid}_exp`,
          ex.subpath === "." ? "root" : ex.subpath
        );
        const label = escapeDslString(
          ex.subpath === "." ? "export: ." : `export: ${ex.subpath}`,
          80
        );
        const target = escapeDslString(ex.target, 200);
        lines.push(`        ${compId} = component "${label}" "${target}"`);
      }
    }
    lines.push("      }");
    lines.push("");
  }

  lines.push("    }");
  lines.push("");

  const relSet = new Set<string>();
  for (const pkg of packages) {
    const fromId = `monorepo.${dslIdent("c", pkg.name)}`;
    for (const depName of pkg.workspaceDeps) {
      if (!byName.has(depName)) continue;
      const toId = `monorepo.${dslIdent("c", depName)}`;
      const key = `${fromId}->${toId}`;
      if (relSet.has(key)) continue;
      relSet.add(key);
      lines.push(`    ${fromId} -> ${toId} "depends on" "pnpm workspace"`);
    }
  }

  lines.push("  }");
  lines.push("");
  lines.push("  views {");
  lines.push("    container monorepo workspace_containers {");
  lines.push("      include *");
  lines.push("      autoLayout lr");
  lines.push("    }");

  for (const pkg of packages) {
    const cid = dslIdent("c", pkg.name);
    const viewKey = dslViewKey(`exports_${pkg.name}`);
    lines.push(`    component monorepo.${cid} ${viewKey} {`);
    lines.push("      include *");
    lines.push("      autoLayout tb");
    lines.push("    }");
  }

  lines.push("  }");
  lines.push("}");
  return lines.join("\n");
}

function main(): void {
  const pkgFiles: string[] = [];
  walkPackageJsonFiles(REPO_ROOT, pkgFiles);
  const packages: PackageInfo[] = [];
  for (const f of pkgFiles.sort()) {
    const p = readPackage(f);
    if (p) packages.push(p);
  }
  packages.sort((a, b) => a.name.localeCompare(b.name));

  const header = [
    "// Generated by: pnpm arch:packages:dsl",
    "// Do not edit by hand — or edit knowing it will be overwritten.",
    "// Preview: https://structurizr.com/dsl (paste contents) or Structurizr Lite / CLI.",
    "",
  ].join("\n");

  const body = buildModel(packages);
  const out = `${header}${body}\n`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, out, "utf8");
  console.log(
    `Wrote ${path.relative(REPO_ROOT, OUT_FILE)} (${packages.length} packages).`
  );
}

main();
