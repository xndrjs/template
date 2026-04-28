# xndrjs monorepo template

## Why this repo exists

**xndrjs** is a family of small TypeScript libraries aimed at real-world apps: safer domain types ([`@xndrjs/branded`](https://www.npmjs.com/package/@xndrjs/branded) with Zod), data-layer helpers ([`@xndrjs/data-layer`](https://www.npmjs.com/package/@xndrjs/data-layer)), retryable async tasks ([`@xndrjs/tasks`](https://www.npmjs.com/package/@xndrjs/tasks)), and more. They are building blocks for a clean architecture — not a framework replacement.

This monorepo **wires those ideas into a concrete layout**: feature-first folders, clear boundaries between domain, orchestration, composition, and adapters, with ESLint enforcing dependency rules. You do not reinvent the structure each time: you start from conventions and keep your code aligned from day one.

The second pillar is **speed to first useful commit**. [Plop](https://plopjs.com) generators (`pnpm plop`) scaffold core packages, domain slices (primitive / shape / proof), ports, use cases, composition apps, and `driven-*` packages—with optional dependencies on `@xndrjs/data-layer` and `@xndrjs/tasks`. A few prompts give you files, barrels, and `package.json` exports consistent with the rest of the repo, instead of hand-copying trees.

In short:

- **WHY**: to adopt and extend the xndrjs ecosystem on top of a sensible architectural baseline;
- **HOW**: pnpm, TypeScript, boundary lint, and Plop so you stay productive from day one.

---

## What is in this repo (current state)

- **pnpm workspace** in [`pnpm-workspace.yaml`](./pnpm-workspace.yaml): `apps/*`, `configs/*`, `composition/*`, packages under `features/*/*`, `features/*/composition/*`, `features/*/infrastructure/*`.
- **Feature-first**: each capability lives under `features/<slug>/` with dedicated workspace packages (`@<slug>/core`, `@<slug>/composition-*`, `@<slug>/driven-*`).
- **Package naming config**: scope/pattern names for generated packages are centralized in [`tools/plop/lib/package-naming.ts`](./tools/plop/lib/package-naming.ts) (`PACKAGE_SCOPES` + naming helpers), so you can customize conventions in one place.
- **Flat package roots**: no required `src/` folder; sources and barrels live at the package root (`index.ts`, slices in subfolders).
- **Shared configs** in `configs/`: TypeScript (`@config/typescript`), ESLint (`@config/eslint`), Vitest (`@config/vitest`).
- **Tooling** in `tools/`: a single Plop setup ([`tools/plop/plopfile.ts`](./tools/plop/plopfile.ts)), scaffold demo ([`tools/demo/run-demo.ts`](./tools/demo/run-demo.ts)).
- **Quality**: Prettier, Husky, lint-staged, Vitest; optional Renovate via [`renovate.json`](./renovate.json).

The root package is named `hexagonal-template` in [`package.json`](./package.json): a private template to clone or fork, not a published library.

---

## Per-feature layout

A typical feature follows this shape (all generatable with Plop):

| Path                                             | Example package              | Role                                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/<kebab>/core/`                         | `@<kebab>/core`              | **Domain** split in `domain/models` (primitives, shapes, proofs) and `domain/operations` (capabilities, services), plus **orchestration** (`orchestration/use-cases`, `orchestration/ports`, and other orchestration files classified as `orchestration-other` in ESLint). |
| `features/<kebab>/composition/<app>/`            | `@<kebab>/composition-<app>` | Wiring for a surface (HTTP, CLI, jobs): assembles dependencies and use cases; depends on core.                                                                                                                                                                             |
| `features/<kebab>/infrastructure/driven-<name>/` | `@<kebab>/driven-<name>`     | Outbound adapters (persistence, external APIs, etc.): flat `.ts` files at the package root, re-exported from `index.ts`.                                                                                                                                                   |

**Cross-package imports** must use workspace package names and each package’s `exports`—not raw paths like `features/...` (blocked by `no-restricted-imports`).

---

## Requirements and quick start

- **Node.js** `>=25 <26` (see root `package.json` `engines`).
- **pnpm** 9.x (pinned in `packageManager`).

```bash
pnpm install
pnpm plop          # interactive generators
pnpm demo:scaffold # smoke test: creates features/demo/ (remove with pnpm demo:clear)
```

---

## Root scripts

| Script                                                 | Description                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm lint:fix`                          | ESLint on the whole repo (including architectural rules).                   |
| `pnpm format` / `pnpm format:check`                    | Prettier.                                                                   |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest.                                                                     |
| `pnpm plop`                                            | Opens the Plop menu ([`tools/plop/plopfile.ts`](./tools/plop/plopfile.ts)). |
| `pnpm demo:scaffold`                                   | Runs the main generators in sequence on `features/demo/`.                   |
| `pnpm demo:clear`                                      | Deletes `features/demo/`.                                                   |
| `pnpm deps:renovate`                                   | Validates `renovate.json`.                                                  |

Lint a single package: `pnpm -C features/<slug>/core lint`.

---

## TypeScript

- Shared base: [`configs/config-typescript/base.json`](./configs/config-typescript/base.json), extended by [`tsconfig.repo.json`](./tsconfig.repo.json) (ESNext, `moduleResolution: bundler`).
- Each workspace package has its own `tsconfig.json` extending the repo config.

---

## ESLint and architecture

The flat config lives in [`configs/config-eslint/index.js`](./configs/config-eslint/index.js) and is loaded from the root via [`eslint.config.cjs`](./eslint.config.cjs). It uses `eslint-plugin-boundaries` with a **single `domain`** layer (`features/*/core/domain/**`), orchestration slices (**use-cases**, **ports**, **other**), `features/*/infrastructure/**`, `features/*/composition/**`, `apps/**`, and `features/*/ui/**`. **`boundaries/dependencies` is off** for `tools/**`, `configs/**`, and `*.{test,spec}.ts(x)` so scripts and tests are not forced into feature layers.

Dependency matrix (workspace imports; paths like `features/...` remain blocked by `no-restricted-imports`):

| From                          | May import (layer types)                                                  |
| ----------------------------- | ------------------------------------------------------------------------- |
| **Domain**                    | domain only                                                               |
| **Orchestration** (any slice) | domain + ports + orchestration-other — **not** other use-cases            |
| **Infrastructure**            | domain + ports + orchestration-other + infrastructure — **not** use-cases |
| **Composition**               | domain + full orchestration + full infrastructure                         |
| **Apps**                      | composition + ui                                                          |
| **UI**                        | ui only                                                                   |

There is **no** dedicated `mappers` orchestration slice: mapping stays where it belongs (often in `driven-*` or next to contracts).

---

## Tests

[`vitest.config.ts`](./vitest.config.ts) uses `defineBaseVitestConfig` from `@config/vitest` and includes `features/**/*.test.ts` and `tools/**/*.test.ts`.

---

## Plop generators

Command: `pnpm plop`. Helpers live in [`tools/plop/lib/`](./tools/plop/lib/) (casing, core package discovery, workspace dependency versions).

| Generator                               | What it creates                                                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feature-core`                          | `features/<kebab>/core/` — `@core/<kebab>`, domain split entry points (`models`, `operations`), orchestration (`use-cases`, `ports`), root `index.ts` and `package.json` exports. |
| `feature-composition-app`               | `features/<kebab>/composition/<app>/` — composition package wired to core.                                                                                                        |
| `feature-infrastructure-driven-package` | `features/<kebab>/infrastructure/driven-<name>/` — adapter package; **checkbox** to add `@xndrjs/data-layer` and/or `@xndrjs/tasks` (both selected by default).                   |
| `feature-core-branded-primitive`        | Zod + `@xndrjs/branded` primitive in `domain/models/primitives/<kebab>.primitive.ts` (prompt: string / number / boolean / date / uuid / bigint / custom `z.*`).                   |
| `feature-core-branded-shape`            | Branded shape in `domain/models/shapes/<kebab>.shape.ts`.                                                                                                                         |
| `feature-core-proof`                    | Schema-first proof under `domain/models/proofs/<kebab>.proof.ts` using `branded.proof(brand, schema)`.                                                                            |
| `feature-core-capability`               | Reusable capability under `domain/operations/capabilities/<kebab>.capability.ts` using `branded.capabilities<...>().methods(...)`.                                                |
| `feature-core-port`                     | `orchestration/ports/<kebab>.port.ts` — empty port interface scaffold; barrel updated.                                                                                            |
| `feature-core-use-case`                 | `orchestration/use-cases/<kebab>.use-case.ts` — `create<Name>UseCase` factory; barrel updated.                                                                                    |

---

## Renovate

[`renovate.json`](./renovate.json) automates dependency and lockfile updates on your forge ([Renovate docs](https://docs.renovatebot.com/)). Local validation: `pnpm deps:renovate`.

---

## Quick conventions

- **File suffixes**: `.primitive.ts`, `.shape.ts`, `.proof.ts`, `.capability.ts`, `.service.ts`, `.port.ts`, `.use-case.ts`.
- **xndrjs in core**: `feature-core` adds `zod`, `@xndrjs/branded` (`^0.3.0-alpha.0`), and `@xndrjs/orchestration` (`^0.3.0-alpha.0`) (use cases as plain factories with anemic boundary). `driven-*` packages can add `data-layer` and `tasks` (`^0.1.2-alpha.0`) via their generator.
- **Smoke test**: after `pnpm demo:scaffold`, inspect `features/demo/`; `pnpm demo:clear` removes it.
