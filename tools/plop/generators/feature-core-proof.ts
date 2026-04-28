import fs from "node:fs";
import path from "node:path";
import type { ActionType, NodePlopAPI } from "node-plop";
import {
  appendExportToBarrelIndex,
  ensureModelsIndexReexportsModelSlices,
} from "../lib/domain-barrel.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toKebabCase, toPascalCase } from "../lib/casing.ts";

const repoRoot = getRepoRoot();

function domainAbs(repoRootArg: string, coreRel: string) {
  return path.join(repoRootArg, ...coreRel.split("/"), "domain");
}

export default function registerFeatureCoreProofGenerator(plop: NodePlopAPI) {
  plop.setGenerator("feature-core-proof", {
    description:
      "Scaffold schema-first `branded.proof(brand, schema)` under `domain/models/proofs/<kebab>.proof.ts` (TODO stubs).",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Select core package (feature):",
        choices: () => {
          const c = getRepoCorePackageChoices(repoRoot);
          if (!c.length) {
            throw new Error(
              'No core packages found. Run generator "feature-core" for your feature first.'
            );
          }
          return c;
        },
      },
      {
        type: "input",
        name: "proofName",
        message:
          "Proof name (e.g. VerifiedPlopDemoId). File: domain/models/proofs/<kebab>.proof.ts:",
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
      const proofRaw = String(data.proofName ?? "").trim();
      const proofPascal = toPascalCase(proofRaw);
      const proofKebab = toKebabCase(proofRaw);

      if (!coreRel || !proofPascal || !proofKebab) {
        throw new Error("Missing required answers.");
      }
      const outFileName = `${proofKebab}.proof.ts`;
      const outAbs = path.join(
        domainAbs(repoRoot, coreRel),
        "models",
        "proofs",
        outFileName
      );
      if (fs.existsSync(outAbs)) {
        throw new Error(
          `Proof file already exists: domain/models/proofs/${outFileName}`
        );
      }

      const templateData = {
        proofPascal,
      };

      const exportLine = `export * from './${proofKebab}.proof';`;

      return [
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/models/proofs/index.ts",
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/models/primitives/index.ts",
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/models/shapes/index.ts",
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/models/index.ts",
          templateFile: "templates/feature-core/domain-models-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "modify",
          path: "../../{{corePackageRel}}/domain/models/index.ts",
          transform: (file: string) =>
            ensureModelsIndexReexportsModelSlices(file),
        },
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/operations/index.ts",
          templateFile: "templates/feature-core/domain-operations-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/operations/capabilities/index.ts",
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/operations/services/index.ts",
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: `../../${path.posix.join(...coreRel.split("/"), "domain", "models", "proofs", outFileName)}`,
          templateFile: "templates/feature-core/proof.ts.hbs",
          data: templateData,
        },
        {
          type: "modify",
          path: "../../{{corePackageRel}}/domain/models/proofs/index.ts",
          transform: (file: string) =>
            appendExportToBarrelIndex(file, exportLine),
        },
      ];
    },
  });
}
