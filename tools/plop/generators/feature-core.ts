import fs from "node:fs";
import path from "node:path";
import type { NodePlopAPI } from "node-plop";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toKebabCase } from "../lib/casing.ts";

/** Paths in actions are relative to the plopfile directory (`tools/plop/`). */
const TEMPLATE_PREFIX = "templates/feature-core";

function corePackageJsonPath(featureKebab: string): string {
  return path.join(
    getRepoRoot(),
    "features",
    featureKebab,
    "core",
    "package.json"
  );
}

export default function registerFeatureCoreGenerator(plop: NodePlopAPI) {
  plop.setGenerator("feature-core", {
    description:
      "Create features/<kebab>/core/ with @features/<kebab>-core (domain + orchestration entry barrels).",
    prompts: [
      {
        type: "input",
        name: "featureName",
        message: "Feature name (features/<kebab>/ and @features/<kebab>-core):",
        validate: (value: unknown) => {
          const raw = String(value ?? "").trim();
          if (!raw) return "Feature name cannot be empty";
          const kebab = toKebabCase(raw);
          if (!kebab)
            return "Could not derive a kebab-case slug from that name";
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(kebab)) {
            return "Use letters, numbers, and single hyphens (e.g. billing, user-profile)";
          }
          return true;
        },
      },
    ],
    actions: (data) => {
      const k = toKebabCase(String(data?.featureName ?? ""));
      if (!k) return [];

      if (fs.existsSync(corePackageJsonPath(k))) {
        throw new Error(
          `Core package already exists for this feature (features/${k}/core/package.json). Remove it or pick another name.`
        );
      }

      return [
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/package.json",
          templateFile: `${TEMPLATE_PREFIX}/core-package.json.hbs`,
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/tsconfig.json",
          templateFile: `${TEMPLATE_PREFIX}/core-tsconfig.json.hbs`,
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/domain/primitives/index.ts",
          templateFile: `${TEMPLATE_PREFIX}/orchestration-slice-index.ts.hbs`,
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/domain/shapes/index.ts",
          templateFile: `${TEMPLATE_PREFIX}/orchestration-slice-index.ts.hbs`,
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/domain/services/index.ts",
          templateFile: `${TEMPLATE_PREFIX}/orchestration-slice-index.ts.hbs`,
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/domain/proofs/index.ts",
          templateFile: `${TEMPLATE_PREFIX}/orchestration-slice-index.ts.hbs`,
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/domain/capabilities/index.ts",
          templateFile: `${TEMPLATE_PREFIX}/orchestration-slice-index.ts.hbs`,
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/domain/index.ts",
          templateFile: `${TEMPLATE_PREFIX}/domain-index.ts.hbs`,
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/orchestration/use-cases/index.ts",
          templateFile: `${TEMPLATE_PREFIX}/orchestration-slice-index.ts.hbs`,
          skipIfExists: true,
        },
        {
          type: "add",
          path: "../../features/{{kebabCase featureName}}/core/orchestration/ports/index.ts",
          templateFile: `${TEMPLATE_PREFIX}/orchestration-slice-index.ts.hbs`,
          skipIfExists: true,
        },
        () => {
          const rootKeep = path.join(getRepoRoot(), "features", k, ".gitkeep");
          if (fs.existsSync(rootKeep)) {
            fs.unlinkSync(rootKeep);
          }
          return "";
        },
      ];
    },
  });
}
