import type { ActionType, NodePlopAPI } from "node-plop";
import {
  appendExportToBarrelIndex,
  ensureDomainIndexReexportsDomainSlices,
} from "../lib/domain-barrel.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toKebabCase, toPascalCase } from "../lib/casing.ts";

const repoRoot = getRepoRoot();

function schemaExprForPrimitiveValueKind(
  kind: string,
  customExpr: string
): string {
  switch (kind) {
    case "string":
      return "z.string()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "date":
      return "z.date()";
    case "uuid":
      return "z.uuid()";
    case "bigint":
      return "z.bigint()";
    case "custom":
      return customExpr.trim().length > 0 ? customExpr.trim() : "z.string()";
    default:
      return "z.string()";
  }
}

export default function registerFeatureCoreBrandedPrimitiveGenerator(
  plop: NodePlopAPI
) {
  plop.setGenerator("feature-core-branded-primitive", {
    description:
      "Add a Zod + @xndrjs/branded primitive under core/domain/primitives/ (`<kebab>.primitive.ts`); choose scalar schema (string/number/boolean/date/uuid/bigint or custom `z.*`). See https://www.npmjs.com/package/@xndrjs/branded",
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
        name: "primitiveName",
        message:
          "Branded primitive base name (e.g. CustomerId). File will be `domain/primitives/<kebab>.primitive.ts`:",
        validate: (value: unknown) =>
          String(value ?? "").trim().length > 0 || "Name cannot be empty",
      },
      {
        type: "list",
        name: "primitiveValueKind",
        message: "Underlying Zod value type (non-object scalar):",
        choices: [
          { name: "string — z.string()", value: "string" },
          { name: "number — z.number()", value: "number" },
          { name: "boolean — z.boolean()", value: "boolean" },
          { name: "Date — z.date()", value: "date" },
          { name: "UUID — z.uuid()", value: "uuid" },
          { name: "bigint — z.bigint()", value: "bigint" },
          {
            name: "Custom — any other single Zod schema (e.g. z.email(), z.url(), …)",
            value: "custom",
          },
        ],
        default: "string",
      },
      {
        type: "input",
        name: "primitiveSchemaCustom",
        message:
          "Custom Zod schema expression (must start with `z.`, single expression):",
        when: (answers: Record<string, unknown>) =>
          String(answers.primitiveValueKind ?? "") === "custom",
        validate: (value: unknown) => {
          const v = String(value ?? "").trim();
          if (!v) return "Expression cannot be empty";
          if (!v.startsWith("z.")) {
            return "Must start with z. (e.g. z.email(), z.iso.datetime())";
          }
          return true;
        },
      },
    ],
    actions: (data?: Record<string, unknown>): ActionType[] => {
      if (!data) return [];
      const base = String(data.primitiveName ?? "").trim();
      const pascalName = toPascalCase(base);
      const kebab = toKebabCase(base);
      const kind = String(data.primitiveValueKind ?? "string").trim();
      const customExpr = String(data.primitiveSchemaCustom ?? "").trim();
      const primitiveSchemaExpr = schemaExprForPrimitiveValueKind(
        kind,
        customExpr
      );
      const exportLine = `export * from './${kebab}.primitive';`;

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
          path: "../../{{corePackageRel}}/domain/primitives/{{kebabCase primitiveName}}.primitive.ts",
          templateFile: "templates/feature-core/primitive.ts.hbs",
          data: { pascalName, primitiveSchemaExpr },
        },
        {
          type: "modify",
          path: "../../{{corePackageRel}}/domain/primitives/index.ts",
          transform: (file: string) =>
            appendExportToBarrelIndex(file, exportLine),
        },
      ];
    },
  });
}
