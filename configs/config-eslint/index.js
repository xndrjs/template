import path from "node:path";
import { fileURLToPath } from "node:url";
import eslint from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(dirname, "..", "..");

const domainModelTypes = ["domain-models"];
const domainOperationTypes = ["domain-operations"];

/**
 * Orchestration slices that are NOT use-cases (ports, other orchestration helpers).
 * Use-cases may import these; non–use-case orchestration may import each other and domain,
 * but no use-case ↔ use-case imports.
 */
const orchestrationNonUseCaseSlices = [
  "orchestration-ports",
  "orchestration-other",
];

const orchestrationTypes = [
  "orchestration-use-cases",
  ...orchestrationNonUseCaseSlices,
];

const domainModelRefs = domainModelTypes.map((t) => ({ type: t }));
const domainOperationRefs = domainOperationTypes.map((t) => ({ type: t }));

/** Any orchestration file: domain models/operations + non–use-case orchestration only. */
const orchestrationAllowTo = [
  ...domainModelRefs,
  ...domainOperationRefs,
  ...orchestrationNonUseCaseSlices.map((t) => ({ type: t })),
];

const infrastructureTypes = [
  "infrastructure-driven",
  "infrastructure-lib",
  "infrastructure-other",
];

/** Infrastructure: domain-models + orchestration except use-cases + same-layer infra. */
const infrastructureAllowTo = [
  ...domainModelRefs,
  ...orchestrationNonUseCaseSlices.map((t) => ({ type: t })),
  ...["infrastructure-lib", "infrastructure-other"].map((t) => ({ type: t })),
];

/** Composition: domain-models, full orchestration, full infrastructure. */
const compositionAllowTo = [
  ...domainModelRefs,
  ...orchestrationTypes.map((t) => ({ type: t })),
  ...infrastructureTypes.map((t) => ({ type: t })),
];

/** @type {import('eslint').Linter.Config[]} */
const config = defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "writable",
      },
    },
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        {
          type: "domain-models",
          pattern: "features/*/core/domain/models/**",
        },
        {
          type: "domain-operations",
          pattern: "features/*/core/domain/operations/**",
        },
        {
          type: "orchestration-use-cases",
          pattern: "features/*/core/orchestration/**/use-cases/**",
        },
        {
          type: "orchestration-ports",
          pattern: "features/*/core/orchestration/**/ports/**",
        },
        {
          type: "orchestration-other",
          pattern: "features/*/core/orchestration/**",
        },
        {
          type: "infrastructure-driven",
          pattern: "features/*/infrastructure/driven-*/**",
        },
        {
          type: "infrastructure-lib",
          pattern: "features/*/infrastructure/lib-*/**",
        },
        {
          type: "infrastructure-other",
          pattern: "features/*/infrastructure/**",
        },
        {
          type: "composition",
          pattern: "features/*/composition/**",
        },
        {
          type: "apps",
          pattern: "apps/**",
        },
        {
          type: "ui",
          pattern: "features/*/ui/**",
        },
      ],
      "import/resolver": {
        typescript: {
          project: [path.join(repoRoot, "tsconfig.repo.json")],
        },
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["features/**", "composition/**"],
              message:
                "Do not import from repo layout paths (`features/`, `composition/`). Use workspace package aliases/exports from each package's `package.json`.",
            },
          ],
        },
      ],
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            ...domainModelTypes.map((type) => ({
              from: { type },
              allow: { to: domainModelRefs },
            })),
            ...domainOperationTypes.map((type) => ({
              from: { type },
              allow: {
                to: [...domainModelRefs, ...domainOperationRefs],
              },
            })),

            ...orchestrationTypes.map((type) => ({
              from: { type },
              allow: { to: orchestrationAllowTo },
            })),

            {
              from: { type: "infrastructure-driven" },
              allow: { to: infrastructureAllowTo },
            },
            {
              from: { type: "infrastructure-lib" },
              allow: { to: infrastructureAllowTo },
            },
            {
              from: { type: "infrastructure-other" },
              allow: { to: infrastructureAllowTo },
            },

            {
              from: { type: "composition" },
              allow: { to: compositionAllowTo },
            },

            {
              from: { type: "apps" },
              allow: {
                to: [{ type: "composition" }, { type: "ui" }],
              },
            },

            {
              from: { type: "ui" },
              allow: { to: [{ type: "ui" }] },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["features/*/infrastructure/driven-*/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["features/**", "composition/**"],
              message:
                "Do not import from repo layout paths (`features/`, `composition/`). Use workspace package aliases/exports from each package's `package.json`.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "tools/**/*.{ts,tsx,mts,cts,js,mjs,cjs}",
      "configs/**/*.{ts,tsx,mts,cts,js,mjs,cjs}",
      "**/*.{test,spec}.{ts,tsx,mts,cts}",
    ],
    rules: {
      "boundaries/dependencies": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: [
      "features/*/core/domain/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
      "features/*/core/orchestration/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "process",
          message:
            "Do not use `process` in core domain/orchestration packages; inject Node/platform concerns from composition or infrastructure.",
        },
        {
          name: "globalThis",
          message:
            "Do not use `globalThis` in core domain/orchestration packages; keep code free of global runtime access.",
        },
      ],
    },
  },
  prettierConfig,
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);

export default config;
