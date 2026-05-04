import type { ActionType, NodePlopAPI } from "node-plop";
import {
  appendExportToBarrelIndex,
  ensureModelsIndexReexportsModelSlices,
  ensureOperationsIndexReexportsOperationSlices,
} from "../lib/domain-barrel.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toKebabCase, toPascalCase } from "../lib/casing.ts";

const repoRoot = getRepoRoot();

export default function registerFeatureCoreDomainShapeGenerator(
  plop: NodePlopAPI
) {
  plop.setGenerator("feature-core-domain-shape", {
    description:
      "Add a Zod + @xndrjs/domain-zod shape under core/domain/models/shapes/ (`<kebab>.shape.ts`); exports `const <Name>Shape = domain.shape(...)` — see https://www.npmjs.com/package/@xndrjs/domain-zod",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Select core package:",
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
        name: "shapeName",
        message:
          "Domain shape base name (e.g. AddressSnapshot). File will be `domain/models/shapes/<kebab>.shape.ts`:",
        validate: (value: unknown) =>
          String(value ?? "").trim().length > 0 || "Name cannot be empty",
      },
    ],
    actions: (data?: Record<string, unknown>): ActionType[] => {
      if (!data) return [];
      const base = String(data.shapeName ?? "").trim();
      const pascalName = toPascalCase(base);
      const kebab = toKebabCase(base);
      const exportLine = `export * from './${kebab}.shape';`;

      return [
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
          path: "../../{{corePackageRel}}/domain/models/proofs/index.ts",
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
          type: "modify",
          path: "../../{{corePackageRel}}/domain/operations/index.ts",
          transform: (file: string) =>
            ensureOperationsIndexReexportsOperationSlices(file),
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
          path: "../../{{corePackageRel}}/domain/operations/capabilities/index.ts",
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../{{corePackageRel}}/domain/models/shapes/{{kebabCase shapeName}}.shape.ts",
          templateFile: "templates/feature-core/shape.ts.hbs",
          data: { pascalName },
        },
        {
          type: "modify",
          path: "../../{{corePackageRel}}/domain/models/shapes/index.ts",
          transform: (file: string) =>
            appendExportToBarrelIndex(file, exportLine),
        },
      ];
    },
  });
}
