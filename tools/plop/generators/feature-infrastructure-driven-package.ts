import fs from "node:fs";
import path from "node:path";
import type { ActionType, NodePlopAPI } from "node-plop";
import { featureSegmentFromCorePackageRel } from "../lib/repo-core-paths.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";
import { toKebabCase } from "../lib/casing.ts";
import {
  corePackageName,
  infrastructureDrivenPackageName,
} from "../lib/package-naming.ts";
const repoRoot = getRepoRoot();

const XNDR_INFRA_DRIVEN_PACKAGE_CHOICES = [
  {
    name: "@xndrjs/data-layer — Data layer utilities: batch loaders, registry, mapping helpers.",
    value: "@xndrjs/data-layer",
    checked: true,
  },
  {
    name: "@xndrjs/tasks — Lazy async tasks utilities.",
    value: "@xndrjs/tasks",
    checked: true,
  },
] as const;

const DEFAULT_XNDR_INFRA_DRIVEN_PACKAGES =
  XNDR_INFRA_DRIVEN_PACKAGE_CHOICES.map((c) => c.value);

const DRIVEN_SUFFIX_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const REPOSITORY_IN_NAME_MESSAGE =
  'Avoid the word "repository" in the driven-* suffix — keep the folder name capability- or technology-oriented (e.g. line-item, postgres); persistence and mapping helpers live in the same package as flat *.ts files at package root.';

export default function registerFeatureInfrastructureDrivenPackageGenerator(
  plop: NodePlopAPI
) {
  plop.setGenerator("feature-infrastructure-driven-package", {
    description:
      "Create driven- infrastructure package under features/<feature>/infrastructure/driven-<name>/ (flat TypeScript modules at package root, re-exported from index.ts).",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Select core package (determines features/<slug>/):",
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
        name: "drivenSuffix",
        message:
          "Driven capability suffix (kebab-case, without the driven- prefix), e.g. clock → folder driven-clock and name …-infra-driven-clock:",
        validate: (value: unknown) => {
          const raw = String(value ?? "").trim();
          if (!raw) return "Name cannot be empty";
          if (/repository/i.test(raw)) {
            return REPOSITORY_IN_NAME_MESSAGE;
          }
          const drivenKebab = toKebabCase(raw).replace(/^driven-/u, "");
          if (!drivenKebab) return "Could not derive a kebab-case suffix";
          if (/repository/i.test(drivenKebab)) {
            return REPOSITORY_IN_NAME_MESSAGE;
          }
          if (!DRIVEN_SUFFIX_KEY.test(drivenKebab)) {
            return "Use lowercase letters, numbers, and single hyphens (e.g. clock, stripe-webhooks)";
          }
          return true;
        },
        filter: (value: unknown) => {
          const raw = String(value ?? "").trim();
          return toKebabCase(raw).replace(/^driven-/u, "");
        },
      },
      {
        type: "checkbox",
        name: "xndrInfraDrivenPackages",
        message: "Optional @xndrjs packages to install in this driven package:",
        choices: [...XNDR_INFRA_DRIVEN_PACKAGE_CHOICES],
      },
    ],
    actions: (data?: Record<string, unknown>): ActionType[] => {
      if (!data) return [];
      const drivenKebab = String(data.drivenSuffix ?? "").trim();
      if (!drivenKebab || !DRIVEN_SUFFIX_KEY.test(drivenKebab)) {
        throw new Error("Invalid driven suffix after filter.");
      }

      const coreRel = String(data.corePackageRel ?? "").trim();
      if (!coreRel) {
        throw new Error(
          "Select a core package for feature-scoped infrastructure."
        );
      }

      const featureKebab = featureSegmentFromCorePackageRel(coreRel);
      const corePkgName = corePackageName(featureKebab);
      const infrastructurePkgName = infrastructureDrivenPackageName(
        featureKebab,
        drivenKebab
      );

      const packageRel = `features/${featureKebab}/infrastructure/driven-${drivenKebab}`;
      const packageRootAbs = path.join(repoRoot, ...packageRel.split("/"));
      if (fs.existsSync(path.join(packageRootAbs, "package.json"))) {
        throw new Error(
          `Driven infrastructure package already exists: ${packageRel}`
        );
      }

      const rawSelected = data.xndrInfraDrivenPackages;
      const selected = Array.isArray(rawSelected)
        ? (rawSelected as string[]).filter((p) => typeof p === "string")
        : [...DEFAULT_XNDR_INFRA_DRIVEN_PACKAGES];

      const includeDataLayer = selected.includes("@xndrjs/data-layer");
      const includeTasks = selected.includes("@xndrjs/tasks");
      const hasOptionalXndrDeps = includeDataLayer || includeTasks;

      const templateData = {
        featureKebab,
        drivenKebab,
        corePackageName: corePkgName,
        infrastructurePackageName: infrastructurePkgName,
        hasOptionalXndrDeps,
        includeDataLayer,
        includeTasks,
      };

      return [
        {
          type: "add",
          path: `../../${packageRel}/package.json`,
          templateFile:
            "templates/feature-infrastructure-driven-package/package.json.hbs",
          data: templateData,
        },
        {
          type: "add",
          path: `../../${packageRel}/tsconfig.json`,
          templateFile:
            "templates/feature-infrastructure-driven-package/tsconfig.json.hbs",
          data: templateData,
        },
        {
          type: "add",
          path: `../../${packageRel}/index.ts`,
          templateFile:
            "templates/feature-infrastructure-driven-package/index.ts.hbs",
          data: templateData,
        },
      ];
    },
  });
}
