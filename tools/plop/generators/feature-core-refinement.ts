import fs from "node:fs";
import path from "node:path";
import type { ActionType, NodePlopAPI } from "node-plop";
import {
  appendExportToBarrelIndex,
  ensureDomainIndexReexportsDomainSlices,
} from "../lib/domain-barrel.ts";
import {
  listBrandedPrimitiveRelativePaths,
  listBrandedShapeRelativePaths,
  parsePrimitiveKitId,
  parseShapeKitId,
  sameDirectoryKitImportFromDomainRelPath,
} from "../lib/repo-core-domain-branded-kits.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toKebabCase, toPascalCase } from "../lib/casing.ts";

const repoRoot = getRepoRoot();

function domainAbs(repoRootArg: string, coreRel: string) {
  return path.join(repoRootArg, ...coreRel.split("/"), "domain");
}

function parsePrimitiveSchemaExpr(source: string): string {
  const match = source.match(/const\s+\w+Schema\s*=\s*([\s\S]*?);/);
  if (!match?.[1]) {
    return "z.string()";
  }
  return match[1].trim();
}

export default function registerFeatureCoreRefinementGenerator(
  plop: NodePlopAPI
) {
  plop.setGenerator("feature-core-refinement", {
    description:
      "Scaffold `branded.refine(kit).when(…).as(…)` next to its base kit: `domain/primitives/<kebab>.primitive.refinement.ts` or `domain/shapes/<kebab>.shape.refinement.ts` (TODO stubs).",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Select @features/*-core package (feature):",
        choices: () => {
          const c = getRepoCorePackageChoices(repoRoot);
          if (!c.length) {
            throw new Error(
              'No @features/*-core packages found. Run generator "feature-core" for your feature first.'
            );
          }
          return c;
        },
      },
      {
        type: "list",
        name: "baseKind",
        message: "Refine from:",
        choices: [
          {
            name: "Primitive kit (`branded.primitive` in domain/primitives/)",
            value: "primitive",
          },
          {
            name: "Shape kit (`branded.shape` tuple in domain/shapes/)",
            value: "shape",
          },
        ],
      },
      {
        type: "list",
        name: "baseDomainRelPath",
        message: "Select base module (must export a branded kit):",
        choices: (answers: Record<string, unknown>) => {
          const rel = String(answers.corePackageRel ?? "");
          if (!rel) return [];
          const kind = String(answers.baseKind ?? "");
          const list =
            kind === "shape"
              ? listBrandedShapeRelativePaths(repoRoot, rel)
              : listBrandedPrimitiveRelativePaths(repoRoot, rel);
          if (!list.length) {
            throw new Error(
              kind === "shape"
                ? `No base *.shape.ts files under ${rel}/domain/shapes/. Add one with "feature-core-branded-shape" first.`
                : `No base *.primitive.ts files under ${rel}/domain/primitives/. Add one with "feature-core-branded-primitive" first.`
            );
          }
          return list.map((p) => ({ name: p, value: p }));
        },
      },
      {
        type: "input",
        name: "refinementName",
        message:
          "Refinement name (e.g. VerifiedPlopDemoId). File: domain/primitives|<shapes>/<kebab>.primitive|.shape.refinement.ts:",
        validate: (value: unknown) => {
          const raw = String(value ?? "").trim();
          if (!raw) return "Name cannot be empty";
          const kebab = toKebabCase(raw);
          if (!kebab) return "Could not derive a kebab-case slug";
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(kebab)) {
            return "Use letters, numbers, and single hyphens after normalization";
          }
          return true;
        },
      },
    ],
    actions: (data?: Record<string, unknown>): ActionType[] => {
      if (!data) return [];
      const coreRel = String(data.corePackageRel ?? "").trim();
      const baseKind = String(data.baseKind ?? "").trim();
      const baseDomainRelPath = String(data.baseDomainRelPath ?? "").trim();
      const refinementRaw = String(data.refinementName ?? "").trim();
      const refinedPascal = toPascalCase(refinementRaw);
      const refinedKebab = toKebabCase(refinementRaw);

      if (
        !coreRel ||
        !baseKind ||
        !baseDomainRelPath ||
        !refinedPascal ||
        !refinedKebab
      ) {
        throw new Error("Missing required answers.");
      }
      if (baseKind !== "primitive" && baseKind !== "shape") {
        throw new Error(`Invalid baseKind: ${baseKind}`);
      }

      const sourcePath = path.join(
        domainAbs(repoRoot, coreRel),
        ...baseDomainRelPath.split("/")
      );
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Base file not found: ${baseDomainRelPath}`);
      }
      const source = fs.readFileSync(sourcePath, "utf8");
      const baseKitId =
        baseKind === "shape"
          ? parseShapeKitId(source)
          : parsePrimitiveKitId(source);
      if (!baseKitId) {
        throw new Error(
          `Could not parse a branded.${baseKind} kit export from ${baseDomainRelPath}. Expected ${
            baseKind === "shape"
              ? "`const [SomeShape, patchSome] = branded.shape(` and/or `export { SomeShape }` (legacy: `export const [SomeShape, patchSome] = branded.shape(`)"
              : "`export const SomeId = branded.primitive(`"
          }.`
        );
      }

      const baseKitImportPath =
        sameDirectoryKitImportFromDomainRelPath(baseDomainRelPath);
      const sliceDir = baseKind === "primitive" ? "primitives" : "shapes";
      const outFileName = `${refinedKebab}.${baseKind}.refinement.ts`;
      const outAbs = path.join(
        domainAbs(repoRoot, coreRel),
        sliceDir,
        outFileName
      );
      if (fs.existsSync(outAbs)) {
        throw new Error(
          `Refinement file already exists: domain/${sliceDir}/${outFileName}`
        );
      }

      const templateData = {
        baseKitId,
        baseKitImportPath,
        isShape: baseKind === "shape",
        primitiveSchemaExpr:
          baseKind === "primitive"
            ? parsePrimitiveSchemaExpr(source)
            : undefined,
        refinedPascal,
      };

      const exportLine = `export * from './${refinedKebab}.${baseKind}.refinement';`;

      const sliceIndexPath = `../../{{corePackageRel}}/domain/${sliceDir}/index.ts`;

      return [
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/primitives/index.ts",
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/shapes/index.ts",
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "modify",
          path: "../../{{corePackageRel}}/domain/index.ts",
          transform: (file: string) =>
            ensureDomainIndexReexportsDomainSlices(file),
        },
        {
          type: "add",
          path: `../../${path.posix.join(...coreRel.split("/"), "domain", sliceDir, outFileName)}`,
          templateFile: "templates/feature-core/refinement.ts.hbs",
          data: templateData,
        },
        {
          type: "modify",
          path: sliceIndexPath,
          transform: (file: string) =>
            appendExportToBarrelIndex(file, exportLine),
        },
      ];
    },
  });
}
