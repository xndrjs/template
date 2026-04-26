import path from "node:path";
import { fileURLToPath } from "node:url";
import eslint from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(dirname, "..", "..");

// Single domain layer: features/*/core/domain (pattern in boundaries/elements).
const domainTypes = ["domain"];

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

const domainRefs = domainTypes.map((t) => ({ type: t }));

/** Any orchestration file: domain + non–use-case orchestration only. */
const orchestrationAllowTo = [
  ...domainRefs,
  ...orchestrationNonUseCaseSlices.map((t) => ({ type: t })),
];

const infrastructureTypes = [
  "infrastructure-driven",
  "infrastructure-lib",
  "infrastructure-other",
];

/** Infrastructure: domain + orchestration except use-cases + same-layer infra. */
const infrastructureAllowTo = [
  ...domainRefs,
  ...orchestrationNonUseCaseSlices.map((t) => ({ type: t })),
  ...["infrastructure-lib", "infrastructure-other"].map((t) => ({ type: t })),
];

/** Composition: domain, full orchestration, full infrastructure. */
const compositionAllowTo = [
  ...domainRefs,
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
          type: "domain",
          pattern: "features/*/core/domain/**",
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
            ...domainTypes.map((type) => ({
              from: { type },
              allow: { to: domainRefs },
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
