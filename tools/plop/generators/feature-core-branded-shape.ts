import type { ActionType, NodePlopAPI } from "node-plop";
import {
  appendExportToBarrelIndex,
  ensureDomainIndexReexportsDomainSlices,
} from "../lib/domain-barrel.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toKebabCase, toPascalCase } from "../lib/casing.ts";

const repoRoot = getRepoRoot();

export default function registerFeatureCoreBrandedShapeGenerator(
  plop: NodePlopAPI
) {
  plop.setGenerator("feature-core-branded-shape", {
    description:
      "Add a Zod + @xndrjs/branded shape under core/domain/shapes/ (`<kebab>.shape.ts`); returns `[kit, patch]` — see https://www.npmjs.com/package/@xndrjs/branded",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Select @features/*-core package:",
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
        type: "input",
        name: "shapeName",
        message:
          "Branded shape base name (e.g. AddressSnapshot). File will be `domain/shapes/<kebab>.shape.ts`:",
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
          path: "../../{{corePackageRel}}/domain/shapes/{{kebabCase shapeName}}.shape.ts",
          templateFile: "templates/feature-core/shape.ts.hbs",
          data: { pascalName },
        },
        {
          type: "modify",
          path: "../../{{corePackageRel}}/domain/shapes/index.ts",
          transform: (file: string) =>
            appendExportToBarrelIndex(file, exportLine),
        },
      ];
    },
  });
}
