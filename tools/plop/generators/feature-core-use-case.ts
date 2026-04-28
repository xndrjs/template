import type { ActionType, NodePlopAPI } from "node-plop";
import { appendExportToBarrelIndex } from "../lib/domain-barrel.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toCamelCase, toKebabCase, toPascalCase } from "../lib/casing.ts";

const repoRoot = getRepoRoot();

/**
 * "CreateInvoiceUseCase" / "create invoice use case" → base for class CreateInvoiceUseCase.
 */
function stripTrailingUseCaseLabel(raw: string): string {
  return raw
    .trim()
    .replace(/\s+use[\s_-]?case\s*$/i, "")
    .trim()
    .replace(/usecase$/i, "")
    .trim();
}

export default function registerFeatureCoreUseCaseGenerator(plop: NodePlopAPI) {
  plop.setGenerator("feature-core-use-case", {
    description:
      "Add an orchestration use case under core/orchestration/use-cases/ (`<kebab>.use-case.ts`, `create<Name>UseCase` factory); updates the slice barrel.",
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
        name: "useCaseName",
        message:
          "Use case base name (e.g. CreateInvoice). File: orchestration/use-cases/<kebab>.use-case.ts, export: create<Name>UseCase:",
        validate: (value: unknown) => {
          const base = stripTrailingUseCaseLabel(String(value ?? ""));
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

      const base = stripTrailingUseCaseLabel(String(data.useCaseName ?? ""));
      const pascalUseCaseName = toPascalCase(base);
      const kebab = toKebabCase(base);
      if (!pascalUseCaseName || !kebab) {
        throw new Error("Invalid use case name after normalization.");
      }

      const exportLine = `export * from './${kebab}.use-case';`;
      const useCasesIndex = `../../${coreRel}/orchestration/use-cases/index.ts`;
      const useCaseFile = `../../${coreRel}/orchestration/use-cases/${kebab}.use-case.ts`;

      return [
        {
          type: "add",
          path: useCasesIndex,
          templateFile:
            "templates/feature-core/orchestration-slice-index.ts.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: useCaseFile,
          templateFile: "templates/feature-core/use-case.ts.hbs",
          data: {
            pascalUseCaseName,
            camelUseCaseName: toCamelCase(base),
          },
        },
        {
          type: "modify",
          path: useCasesIndex,
          transform: (file: string) =>
            appendExportToBarrelIndex(file, exportLine),
        },
      ];
    },
  });
}
