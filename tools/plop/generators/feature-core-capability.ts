import type { ActionType, NodePlopAPI } from "node-plop";
import {
  appendExportToBarrelIndex,
  ensureDomainIndexReexportsDomainSlices,
} from "../lib/domain-barrel.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toKebabCase, toPascalCase } from "../lib/casing.ts";

const repoRoot = getRepoRoot();

function stripTrailingCapabilityLabel(raw: string): string {
  return raw
    .trim()
    .replace(/\s+capability\s*$/i, "")
    .trim()
    .replace(/Capability$/u, "")
    .trim();
}

export default function registerFeatureCoreCapabilityGenerator(
  plop: NodePlopAPI
) {
  plop.setGenerator("feature-core-capability", {
    description:
      "Add a domain capability under core/domain/capabilities/ (`<kebab>.capability.ts`, `<Name>Capability` export); updates domain barrels.",
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
        name: "capabilityName",
        message:
          "Capability base name (e.g. UserRename). File: domain/capabilities/<kebab>.capability.ts, export: <Name>Capability:",
        validate: (value: unknown) => {
          const base = stripTrailingCapabilityLabel(String(value ?? ""));
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

      const base = stripTrailingCapabilityLabel(
        String(data.capabilityName ?? "")
      );
      const pascalCapabilityName = toPascalCase(base);
      const kebab = toKebabCase(base);
      if (!pascalCapabilityName || !kebab) {
        throw new Error("Invalid capability name after normalization.");
      }

      const exportLine = `export * from './${kebab}.capability';`;
      const domainIndex = `../../${coreRel}/domain/index.ts`;
      const capabilitiesIndex = `../../${coreRel}/domain/capabilities/index.ts`;
      const capabilityFile = `../../${coreRel}/domain/capabilities/${kebab}.capability.ts`;

      return [
        {
          type: "add",
          path: capabilitiesIndex,
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: domainIndex,
          templateFile: "templates/feature-core/domain-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "modify",
          path: domainIndex,
          transform: (file: string) =>
            ensureDomainIndexReexportsDomainSlices(file),
        },
        {
          type: "add",
          path: capabilityFile,
          templateFile: "templates/feature-core/capability.ts.hbs",
          data: { pascalCapabilityName },
        },
        {
          type: "modify",
          path: capabilitiesIndex,
          transform: (file: string) =>
            appendExportToBarrelIndex(file, exportLine),
        },
      ];
    },
  });
}
