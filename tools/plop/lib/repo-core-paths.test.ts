import { describe, expect, it } from "vitest";
import {
  compositionPackageRelFromCoreRel,
  featureSegmentFromCorePackageRel,
} from "./repo-core-paths.ts";

describe("repo-core-paths", () => {
  it("derives feature segment from core package path", () => {
    expect(featureSegmentFromCorePackageRel("features/plop-demo/core")).toBe(
      "plop-demo"
    );
  });

  it("derives composition package path from core + app slug", () => {
    expect(
      compositionPackageRelFromCoreRel("features/plop-demo/core", "web")
    ).toBe("features/plop-demo/composition/web");
  });
});
