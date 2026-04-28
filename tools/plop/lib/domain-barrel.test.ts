import { describe, expect, it } from "vitest";
import {
  appendExportToBarrelIndex,
  ensureModelsIndexReexportsModelSlices,
  ensureOperationsIndexReexportsOperationSlices,
} from "./domain-barrel.ts";

describe("domain-barrel", () => {
  it("appendExportToBarrelIndex appends once", () => {
    const line = "export * from './foo.primitive';";
    expect(appendExportToBarrelIndex("export {}\n", line)).toBe(`${line}\n`);
    expect(
      appendExportToBarrelIndex(`export * from './bar.primitive';\n`, line)
    ).toBe(`export * from './bar.primitive';\n${line}\n`);
  });

  it("ensureModelsIndexReexportsModelSlices ensures models slices", () => {
    const out = ensureModelsIndexReexportsModelSlices("export {}\n");
    expect(out).toContain('export * from "./primitives";');
    expect(out).toContain('export * from "./shapes";');
    expect(out).toContain('export * from "./proofs";');
  });

  it("ensureOperationsIndexReexportsOperationSlices ensures operations slices", () => {
    const out = ensureOperationsIndexReexportsOperationSlices("export {}\n");
    expect(out).toContain('export * from "./capabilities";');
    expect(out).toContain('export * from "./services";');
  });
});
