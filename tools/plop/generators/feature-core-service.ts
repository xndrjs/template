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

function stripTrailingServiceLabel(raw: string): string {
  return raw
    .trim()
    .replace(/\s+service\s*$/i, "")
    .trim()
    .replace(/Service$/u, "")
    .trim();
}

export default function registerFeatureCoreServiceGenerator(plop: NodePlopAPI) {
  plop.setGenerator("feature-core-service", {
    description:
      "Add a domain service under core/domain/operations/services/ (`<kebab>.service.ts`, default `<Name>Service` export); updates domain barrels.",
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
        type: "input",
        name: "serviceName",
        message:
          "Service base name (e.g. PriceCalculator). File: domain/operations/services/<kebab>.service.ts, function: <Name>Service:",
        validate: (value: unknown) => {
          const base = stripTrailingServiceLabel(String(value ?? ""));
          if (!base) return "Name cannot be empty";
          const pascal = toPascalCase(base);
          if (!pascal) return "Could not derive a PascalCase name";
          return true;
        },
      },
    ],
    actions: (data?: Record<string, unknown>): ActionType[] => {
      if (!data) return [];
      const coreRel = String(data.corePackageRel ?? "").trim();
      if (!coreRel) {
        throw new Error("Select a core package.");
      }

      const base = stripTrailingServiceLabel(String(data.serviceName ?? ""));
      const pascalServiceName = toPascalCase(base);
      const kebab = toKebabCase(base);
      if (!pascalServiceName || !kebab) {
        throw new Error("Invalid service name after normalization.");
      }

      const exportLine = `export * from './${kebab}.service';`;
      const operationsIndex = `../../${coreRel}/domain/operations/index.ts`;
      const servicesIndex = `../../${coreRel}/domain/operations/services/index.ts`;
      const serviceFile = `../../${coreRel}/domain/operations/services/${kebab}.service.ts`;

      return [
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
          path: operationsIndex,
          templateFile: "templates/feature-core/domain-operations-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "modify",
          path: operationsIndex,
          transform: (file: string) =>
            ensureOperationsIndexReexportsOperationSlices(file),
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
          path: servicesIndex,
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: serviceFile,
          templateFile: "templates/feature-core/service.ts.hbs",
          data: { pascalServiceName },
        },
        {
          type: "modify",
          path: servicesIndex,
          transform: (file: string) =>
            appendExportToBarrelIndex(file, exportLine),
        },
      ];
    },
  });
}
