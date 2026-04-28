import { describe, expect, it } from "vitest";
import {
  appendExportToBarrelIndex,
  ensureDomainIndexReexportsDomainSlices,
} from "./domain-barrel.ts";

describe("domain-barrel", () => {
  it("appendExportToBarrelIndex appends once", () => {
    const line = "export * from './foo.primitive';";
    expect(appendExportToBarrelIndex("export {}\n", line)).toBe(`${line}\n`);
    expect(
      appendExportToBarrelIndex(`export * from './bar.primitive';\n`, line)
    ).toBe(`export * from './bar.primitive';\n${line}\n`);
  });

  it("ensureDomainIndexReexportsDomainSlices strips legacy and refinements barrel", () => {
    const legacy = `export * from './x.branded-primitive';\nexport * from "./refinements";\n`;
    const out = ensureDomainIndexReexportsDomainSlices(legacy);
    expect(out).toContain('export * from "./primitives";');
    expect(out).toContain('export * from "./shapes";');
    expect(out).toContain('export * from "./proofs";');
    expect(out).toContain('export * from "./capabilities";');
    expect(out).toContain('export * from "./services";');
    expect(out).not.toContain("refinements");
    expect(out).not.toContain("branded-primitive");
  });
});
