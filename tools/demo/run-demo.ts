/**
 * Non-interactive scaffold demo using the minimal Plop generator set in `tools/plop/plopfile.ts`.
 *
 * Creates `features/demo/core`, `composition/web`, `infrastructure/driven-demo`,
 * `apps/demo-web` (workspace app wired to the demo composition),
 * plus primitives `HtmlContent` → refinement `SanitizedHtmlContent`, one shape, shape refinement,
 * one domain service, one port, two use cases (wired into the composition root via
 * `composition-wire-use-cases`), then runs `pnpm install`.
 *
 * Usage (from repo root):
 *   pnpm demo:scaffold
 *
 * Re-run: remove `features/demo` and `apps/demo-web` (e.g. `pnpm demo:clear`) or pass `--force` to delete and recreate.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodePlop from "node-plop";
import { applyCommonPlopSetup } from "../plop/plop-register-common.ts";
import { registerPlopGenerators } from "../plop/plopfile.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const toolsPlopDir = path.join(repoRoot, "tools", "plop");

const DEMO_CORE_REL = "features/demo/core";
const DEMO_COMPOSITION_WEB_REL = "features/demo/composition/web";
const DEMO_DRIVEN_DEMO_REL = "features/demo/infrastructure/driven-demo";
const DEMO_WEB_REL = "apps/demo-web";
const demoFeatureDir = path.join(repoRoot, "features", "demo");
const demoWebDir = path.join(repoRoot, "apps", "demo-web");

function ensureDemoWebApp(): void {
  fs.mkdirSync(demoWebDir, { recursive: true });
  fs.writeFileSync(
    path.join(demoWebDir, "package.json"),
    [
      "{",
      '  "name": "demo-web",',
      '  "version": "1.0.0",',
      '  "description": "App wired to @features/demo-composition-web (demo composition root)",',
      '  "private": true,',
      '  "type": "module",',
      '  "scripts": {',
      '    "lint": "eslint .",',
      '    "lint:fix": "eslint . --fix"',
      "  },",
      '  "dependencies": {',
      '    "@features/demo-composition-web": "workspace:*"',
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(demoWebDir, "tsconfig.json"),
    [
      "{",
      '  "$schema": "https://json.schemastore.org/tsconfig",',
      '  "extends": "../../tsconfig.repo.json",',
      '  "include": [',
      '    "**/*.ts"',
      "  ]",
      "}",
      "",
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(demoWebDir, "index.ts"),
    [
      'import { getDemoWebRoot } from "@features/demo-composition-web";',
      "",
      "const root = getDemoWebRoot({});",
      "await root.verifyUser();",
      "await root.notifyUser();",
      "",
    ].join("\n"),
    "utf8"
  );
}

async function runGenerator(
  plop: Awaited<ReturnType<typeof nodePlop>>,
  name: string,
  answers: Record<string, unknown>
): Promise<void> {
  const gen = plop.getGenerator(name);
  const { changes, failures } = await gen.runActions(answers);
  if (failures.length > 0) {
    const msg = failures
      .map((f) => `${f.type} ${f.path}: ${f.error}`)
      .join("\n");
    throw new Error(`Generator "${name}" failed:\n${msg}`);
  }
  for (const c of changes) {
    if (c.type === "function") continue;
    console.log(`  [${name}] ${c.type} ${c.path}`);
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const demoWebExists = fs.existsSync(demoWebDir);
  if (fs.existsSync(demoFeatureDir) || demoWebExists) {
    if (!force) {
      console.error(
        "Demo paths already exist (`features/demo` and/or `apps/demo-web`). Remove them (e.g. `pnpm demo:clear`) or run with --force to delete and recreate."
      );
      process.exit(1);
    }
    if (fs.existsSync(demoFeatureDir)) {
      fs.rmSync(demoFeatureDir, { recursive: true, force: true });
      console.log("Removed existing demo path (--force): features/demo.");
    }
    if (fs.existsSync(demoWebDir)) {
      fs.rmSync(demoWebDir, { recursive: true, force: true });
      console.log("Removed existing demo path (--force): apps/demo-web.");
    }
  }

  console.log("Loading Plop (minimal generators)…");
  const plop = await nodePlop("");
  plop.setPlopfilePath(toolsPlopDir);
  applyCommonPlopSetup(plop);
  registerPlopGenerators(plop);

  console.log("\n1/14 feature-core …");
  await runGenerator(plop, "feature-core", {
    featureName: "Demo",
  });

  console.log("\n2/14 feature-composition-app …");
  await runGenerator(plop, "feature-composition-app", {
    corePackageRel: DEMO_CORE_REL,
    compositionAppKebab: "web",
  });

  console.log("\n3/14 feature-infrastructure-driven-package …");
  await runGenerator(plop, "feature-infrastructure-driven-package", {
    corePackageRel: DEMO_CORE_REL,
    drivenSuffix: "demo",
    xndrInfraDrivenPackages: ["@xndrjs/data-layer", "@xndrjs/tasks"],
  });

  console.log("\n4/14 feature-core-branded-primitive (HtmlContent) …");
  await runGenerator(plop, "feature-core-branded-primitive", {
    corePackageRel: DEMO_CORE_REL,
    primitiveName: "HtmlContent",
    primitiveValueKind: "string",
  });

  console.log("\n5/14 feature-core-branded-shape …");
  await runGenerator(plop, "feature-core-branded-shape", {
    corePackageRel: DEMO_CORE_REL,
    shapeName: "User",
  });

  console.log(
    "\n6/14 feature-core-refinement (primitive → SanitizedHtmlContent) …"
  );
  await runGenerator(plop, "feature-core-refinement", {
    corePackageRel: DEMO_CORE_REL,
    baseKind: "primitive",
    baseDomainRelPath: "primitives/html-content.primitive.ts",
    refinementName: "SanitizedHtmlContent",
  });

  console.log("\n7/14 feature-core-refinement (shape) …");
  await runGenerator(plop, "feature-core-refinement", {
    corePackageRel: DEMO_CORE_REL,
    baseKind: "shape",
    baseDomainRelPath: "shapes/user.shape.ts",
    refinementName: "VerifiedUser",
  });

  console.log("\n8/14 feature-core-service …");
  await runGenerator(plop, "feature-core-service", {
    corePackageRel: DEMO_CORE_REL,
    serviceName: "UserCalculator",
  });

  console.log("\n9/14 feature-core-port …");
  await runGenerator(plop, "feature-core-port", {
    corePackageRel: DEMO_CORE_REL,
    portName: "UserNotifier",
  });

  console.log("\n10/14 feature-core-use-case (VerifyUser) …");
  await runGenerator(plop, "feature-core-use-case", {
    corePackageRel: DEMO_CORE_REL,
    useCaseName: "VerifyUser",
  });

  console.log("\n11/14 feature-core-use-case (NotifyUser) …");
  await runGenerator(plop, "feature-core-use-case", {
    corePackageRel: DEMO_CORE_REL,
    useCaseName: "NotifyUser",
  });

  console.log("\n12/14 composition-wire-use-cases …");
  await runGenerator(plop, "composition-wire-use-cases", {
    compositionPackageRel: DEMO_COMPOSITION_WEB_REL,
    corePackageRel: DEMO_CORE_REL,
    useCaseStems: ["verify-user", "notify-user"],
  });

  console.log("\n13/14 apps/demo-web …");
  ensureDemoWebApp();
  console.log(`  [demo-web] wrote ${DEMO_WEB_REL}`);

  console.log("\n14/14 done (scaffold paths created).");

  console.log(
    "\nRunning pnpm install (workspace links, refresh lockfile if needed)…"
  );
  const r = spawnSync("pnpm", ["install", "--no-frozen-lockfile"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.warn(
      "\npnpm install exited with a non-zero status (e.g. Node engines mismatch). New packages are on disk; run `pnpm install` when your environment satisfies package.json engines."
    );
  }

  console.log(
    `\nDemo scaffold done:\n  - ${DEMO_CORE_REL}\n  - ${DEMO_COMPOSITION_WEB_REL}\n  - ${DEMO_DRIVEN_DEMO_REL}\n  - ${DEMO_WEB_REL}`
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
