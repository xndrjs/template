import { describe, expect, it } from "vitest";
import { wireUseCasesIntoCompositionIndex } from "./composition-root-wire.ts";

const scaffold = `import type { RequestContext } from "./types.js";

class DemoWebInfrastructureProvider {
  getForContext(_ctx: RequestContext) {
    return {};
  }
}

const infrastructureProvider = new DemoWebInfrastructureProvider();

export function getDemoWebRoot(ctx: RequestContext) {
  const _infrastructure = infrastructureProvider.getForContext(ctx);
  return {

  };
}
`;

const scaffoldPrettierReturn = `import type { RequestContext } from "./types.js";

export function getDemoWebRoot(ctx: RequestContext) {
  const _infrastructure = infrastructureProvider.getForContext(ctx);
  return {};
}
`;

describe("wireUseCasesIntoCompositionIndex", () => {
  it("handles Prettier-style empty return {}", () => {
    const out = wireUseCasesIntoCompositionIndex(scaffoldPrettierReturn, [
      { corePkgName: "@core/demo", kebabStem: "verify-user" },
    ]);
    expect(out).toContain("verifyUser: createVerifyUserUseCase({}),");
    expect(out).toMatch(/return \{[^}]*verifyUser/s);
  });

  it("adds imports and return entries for use cases", () => {
    const out = wireUseCasesIntoCompositionIndex(scaffold, [
      { corePkgName: "@core/demo", kebabStem: "verify-user" },
    ]);
    expect(out).toContain(
      'import { createVerifyUserUseCase } from "@core/demo/use-cases";'
    );
    expect(out).toContain("verifyUser: createVerifyUserUseCase({}),");
  });

  it("is idempotent for the same wire", () => {
    const once = wireUseCasesIntoCompositionIndex(scaffold, [
      { corePkgName: "@core/demo", kebabStem: "verify-user" },
    ]);
    const twice = wireUseCasesIntoCompositionIndex(once, [
      { corePkgName: "@core/demo", kebabStem: "verify-user" },
    ]);
    expect(twice).toBe(once);
  });

  it("appends a second use case after the first", () => {
    const once = wireUseCasesIntoCompositionIndex(scaffold, [
      { corePkgName: "@core/demo", kebabStem: "verify-user" },
    ]);
    const twice = wireUseCasesIntoCompositionIndex(once, [
      { corePkgName: "@core/demo", kebabStem: "create-order" },
    ]);
    expect(twice).toContain("createOrder: createCreateOrderUseCase({}),");
  });
});
