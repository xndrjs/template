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

  it("parseShapeKitId finds shape kit export (legacy export const tuple)", () => {
    const src = `
export const [PlopDemoPayloadShape, patchPlopDemoPayload] = branded.shape(
  "PlopDemoPayload",
  PlopDemoPayloadSchema
);
`;
    expect(parseShapeKitId(src)).toBe("PlopDemoPayloadShape");
  });

  it("parseShapeKitId finds shape kit (internal tuple + export { Shape })", () => {
    const src = `
const [UserShape, patchUser] = branded.shape(
  "User",
  UserSchema,
  { methods: {} }
);
export type User = BrandedType<typeof UserShape>;
export { UserShape };
`;
    expect(parseShapeKitId(src)).toBe("UserShape");
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
