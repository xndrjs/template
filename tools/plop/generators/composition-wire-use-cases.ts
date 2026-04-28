import type { ActionType, NodePlopAPI } from "node-plop";
import { wireUseCasesIntoCompositionIndex } from "../lib/composition-root-wire.ts";
import { getRepoCompositionPackageChoices } from "../lib/repo-composition-packages.ts";
import {
  getRepoCorePackageChoices,
  readCorePackageJsonName,
} from "../lib/repo-core-packages.ts";
import { getUseCaseChoicesForCore } from "../lib/repo-core-use-cases.ts";
import { getRepoRoot } from "../lib/repo-root.ts";

const repoRoot = getRepoRoot();

export default function registerCompositionWireUseCasesGenerator(
  plop: NodePlopAPI
) {
  plop.setGenerator("composition-wire-use-cases", {
    description:
      "Wire core use-case factories into a composition root `get*Root` with `create…UseCase({})` (empty deps — fill ports manually). Adds a workspace dependency on the core package if missing.",
    prompts: [
      {
        type: "list",
        name: "compositionPackageRel",
        message: "Composition root package:",
        choices: () => {
          const c = getRepoCompositionPackageChoices(repoRoot);
          if (!c.length) {
            throw new Error(
              'No composition packages found. Run "feature-composition-app" first.'
            );
          }
          return c;
        },
      },
      {
        type: "list",
        name: "corePackageRel",
        message: "Feature core package (use-case source):",
        choices: () => {
          const c = getRepoCorePackageChoices(repoRoot);
          if (!c.length) {
            throw new Error(
              'No core packages found. Run "feature-core" (or scaffold demo) first.'
            );
          }
          return c;
        },
      },
      {
        type: "checkbox",
        name: "useCaseStems",
        message: "Use cases to wire:",
        choices: (answers: { corePackageRel?: string }) => {
          const rel = String(answers.corePackageRel ?? "");
          if (!rel) {
            return [];
          }
          return getUseCaseChoicesForCore(repoRoot, rel);
        },
        validate: (selected: unknown) => {
          const arr = selected as string[] | undefined;
          if (!arr?.length) {
            return "Pick at least one use case.";
          }
          return true;
        },
      },
    ],
    actions: (data?: Record<string, unknown>): ActionType[] => {
      if (!data) return [];
      const compositionRel = String(data.compositionPackageRel ?? "").trim();
      const coreRel = String(data.corePackageRel ?? "").trim();
      const stems = data.useCaseStems as string[] | undefined;
      if (!compositionRel || !coreRel || !stems?.length) {
        throw new Error(
          "Composition package, core package, and at least one use case are required."
        );
      }

      const corePkgName = readCorePackageJsonName(repoRoot, coreRel);
      const wires = stems.map((kebabStem) => ({ corePkgName, kebabStem }));

      return [
        {
          type: "modify",
          path: `../../${compositionRel}/package.json`,
          transform: (content: string) => {
            const pkg = JSON.parse(content) as {
              dependencies?: Record<string, string>;
            };
            pkg.dependencies = pkg.dependencies ?? {};
            if (!pkg.dependencies[corePkgName]) {
              pkg.dependencies[corePkgName] = "workspace:*";
            }
            return `${JSON.stringify(pkg, null, 2)}\n`;
          },
        },
        {
          type: "modify",
          path: `../../${compositionRel}/index.ts`,
          transform: (content: string) =>
            wireUseCasesIntoCompositionIndex(content, wires),
        },
      ];
    },
  });
}
