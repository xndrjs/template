import { describe, expect, it } from "vitest";
import {
  importModulePathFromDomainRel,
  parsePrimitiveKitId,
  parseShapeKitId,
  sameDirectoryKitImportFromDomainRelPath,
} from "./repo-core-domain-kits.ts";

describe("repo-core-domain-kits", () => {
  it("parsePrimitiveKitId finds domain.primitive export", () => {
    const src = `
export const PlopDemoId = domain.primitive("PlopDemoId", zodToValidator(PlopDemoIdSchema));
`;
    expect(parsePrimitiveKitId(src)).toBe("PlopDemoId");
  });

  it("parsePrimitiveKitId finds legacy branded.primitive export", () => {
    const src = `
export const PlopDemoId = branded.primitive("PlopDemoId", PlopDemoIdSchema);
`;
    expect(parsePrimitiveKitId(src)).toBe("PlopDemoId");
  });

  it("parseShapeKitId finds domain.shape export (export const assignment)", () => {
    const src = `
export const PlopDemoPayloadShape = domain.shape(
  "PlopDemoPayload",
  zodToValidator(PlopDemoPayloadSchema)
);
`;
    expect(parseShapeKitId(src)).toBe("PlopDemoPayloadShape");
  });

  it("parseShapeKitId finds legacy branded.shape export (export const assignment)", () => {
    const src = `
export const PlopDemoPayloadShape = branded.shape(
  "PlopDemoPayload",
  PlopDemoPayloadSchema
);
`;
    expect(parseShapeKitId(src)).toBe("PlopDemoPayloadShape");
  });

  it("parseShapeKitId finds shape kit (const assignment + export { Shape })", () => {
    const src = `
const UserShape = domain.shape(
  "User",
  zodToValidator(UserSchema)
);
export type User = ReturnType<typeof UserShape["create"]>;
export { UserShape };
`;
    expect(parseShapeKitId(src)).toBe("UserShape");
  });

  it("parseShapeKitId keeps supporting legacy tuple declarations", () => {
    const src = `
const [LegacyUserShape, patchLegacyUser] = branded.shape(
  "LegacyUser",
  LegacyUserSchema
);
`;
    expect(parseShapeKitId(src)).toBe("LegacyUserShape");
  });

  it("parseShapeKitId falls back to named export only", () => {
    const src = `
export { FooShape };
`;
    expect(parseShapeKitId(src)).toBe("FooShape");
  });

  it("importModulePathFromDomainRel builds relative import without extension", () => {
    expect(
      importModulePathFromDomainRel("primitives/plop-demo-id.primitive.ts")
    ).toBe("../primitives/plop-demo-id.primitive");
    expect(importModulePathFromDomainRel("shapes/foo.shape.ts")).toBe(
      "../shapes/foo.shape"
    );
  });

  it("sameDirectoryKitImportFromDomainRelPath builds sibling import", () => {
    expect(
      sameDirectoryKitImportFromDomainRelPath(
        "primitives/plop-demo-id.primitive.ts"
      )
    ).toBe("./plop-demo-id.primitive");
    expect(sameDirectoryKitImportFromDomainRelPath("shapes/foo.shape.ts")).toBe(
      "./foo.shape"
    );
  });
});
