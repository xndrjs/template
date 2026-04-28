import { describe, expect, it } from "vitest";
import {
  importModulePathFromDomainRel,
  parsePrimitiveKitId,
  parseShapeKitId,
  sameDirectoryKitImportFromDomainRelPath,
} from "./repo-core-domain-branded-kits.ts";

describe("repo-core-domain-branded-kits", () => {
  it("parsePrimitiveKitId finds kit export", () => {
    const src = `
export const PlopDemoId = branded.primitive("PlopDemoId", PlopDemoIdSchema);
`;
    expect(parsePrimitiveKitId(src)).toBe("PlopDemoId");
  });

  it("parseShapeKitId finds shape kit export (export const assignment)", () => {
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
const UserShape = branded.shape(
  "User",
  UserSchema
);
export type User = BrandedType<typeof UserShape>;
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
