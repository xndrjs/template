import type { ActionType, NodePlopAPI } from "node-plop";
import { appendExportToBarrelIndex } from "../lib/domain-barrel.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toKebabCase, toPascalCase } from "../lib/casing.ts";

const repoRoot = getRepoRoot();

function stripTrailingPortLabel(raw: string): string {
  return raw
    .trim()
    .replace(/\s+port\s*$/i, "")
    .trim()
    .replace(/Port$/u, "")
    .trim();
}

export default function registerFeatureCorePortGenerator(plop: NodePlopAPI) {
  plop.setGenerator("feature-core-port", {
    description:
      "Add an empty port interface under core/orchestration/ports/ (`<kebab>.port.ts`, `<Name>Port`); updates the slice barrel.",
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
        name: "portName",
        message:
          "Port base name (e.g. TicketRepository or Clock). File: orchestration/ports/<kebab>.port.ts, interface: <Name>Port:",
        validate: (value: unknown) => {
          const base = stripTrailingPortLabel(String(value ?? ""));
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

      const base = stripTrailingPortLabel(String(data.portName ?? ""));
      const pascalBase = toPascalCase(base);
      const kebab = toKebabCase(base);
      if (!pascalBase || !kebab) {
        throw new Error("Invalid port name after normalization.");
      }

      const portInterfaceName = `${pascalBase}Port`;
      const exportLine = `export * from './${kebab}.port';`;
      const portsIndex = `../../${coreRel}/orchestration/ports/index.ts`;
      const portFile = `../../${coreRel}/orchestration/ports/${kebab}.port.ts`;

      return [
        {
          type: "add",
          path: portsIndex,
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: portFile,
          templateFile: "templates/feature-core/port.ts.hbs",
          data: { portInterfaceName },
        },
        {
          type: "modify",
          path: portsIndex,
          transform: (file: string) =>
            appendExportToBarrelIndex(file, exportLine),
        },
      ];
    },
  });
}
