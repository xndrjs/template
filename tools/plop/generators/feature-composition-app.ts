import fs from "node:fs";
import path from "node:path";
import type { ActionType, NodePlopAPI } from "node-plop";
import { toPascalCase } from "../lib/casing.ts";
import {
  compositionPackageRelFromCoreRel,
  featureSegmentFromCorePackageRel,
} from "../lib/repo-core-paths.ts";
import { getRepoCorePackageChoices } from "../lib/repo-core-packages.ts";
import { getRepoRoot } from "../lib/repo-root.ts";

const repoRoot = getRepoRoot();

const COMPOSITION_APP_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function registerFeatureCompositionAppGenerator(
  plop: NodePlopAPI
) {
  plop.setGenerator("feature-composition-app", {
    description:
      "Add a composition-root package under features/<slug>/composition/<app>/ (hub entry + types for RequestContext). Apps import this package to reach wired use cases.",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message:
          "Select @features/*-core package (same feature as this composition root):",
        choices: () => {
          const c = getRepoCorePackageChoices(repoRoot);
          if (!c.length) {
            throw new Error(
              'No @features/*-core packages found. Add features/<slug>/core/package.json with "name": "@features/<slug>-core".'
            );
          }
          return c;
        },
      },
      {
        type: "input",
        name: "compositionAppKebab",
        message:
          "Composition app folder name (kebab-case, e.g. web, admin-cli). Creates features/<feature>/composition/<this>/:",
        default: "web",
        validate: (value: unknown) => {
          const v = String(value ?? "").trim();
          if (!v) return "Name cannot be empty";
          if (!COMPOSITION_APP_KEY.test(v)) {
            return "Use lowercase letters, numbers, and single hyphens (e.g. web, admin-cli)";
          }
          return true;
        },
        filter: (value: unknown) =>
          String(value ?? "")
            .trim()
            .toLowerCase(),
      },
    ],
    actions: (data?: Record<string, unknown>) => {
      if (!data) return [];
      const coreRel = String(data.corePackageRel ?? "");
      const compositionAppKebab = String(data.compositionAppKebab ?? "web")
        .trim()
        .toLowerCase();
      const compositionRel = compositionPackageRelFromCoreRel(
        coreRel,
        compositionAppKebab
      );
      const featureKebab = featureSegmentFromCorePackageRel(coreRel);
      const pascalFeature = toPascalCase(featureKebab);
      const pascalApp = toPascalCase(compositionAppKebab);
      const pascalProvider = `${pascalFeature}${pascalApp}`;

      const compositionAbs = path.join(repoRoot, ...compositionRel.split("/"));
      if (fs.existsSync(path.join(compositionAbs, "package.json"))) {
        throw new Error(
          `Composition package already exists: ${compositionRel}. Pick another app name or remove the folder.`
        );
      }

      const templateData = {
        featureKebab,
        pascalFeature,
        compositionAppKebab,
        pascalProvider,
      };

      const actions: ActionType[] = [
        {
          type: "add",
          path: `../../${compositionRel}/package.json`,
          templateFile: "templates/feature-composition-app/package.json.hbs",
          data: templateData,
        },
        {
          type: "add",
          path: `../../${compositionRel}/tsconfig.json`,
          templateFile: "templates/feature-composition-app/tsconfig.json.hbs",
          data: templateData,
        },
        {
          type: "add",
          path: `../../${compositionRel}/types.ts`,
          templateFile: "templates/feature-composition-app/types.ts.hbs",
          data: templateData,
        },
        {
          type: "add",
          path: `../../${compositionRel}/index.ts`,
          templateFile: "templates/feature-composition-app/index.ts.hbs",
          data: templateData,
        },
      ];

      return actions;
    },
  });
}
