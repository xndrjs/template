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
    const legacy = `export * from './x.branded-primitive';\nexport * from "./refinements/index";\n`;
    const out = ensureDomainIndexReexportsDomainSlices(legacy);
    expect(out).toContain('export * from "./primitives/index";');
    expect(out).toContain('export * from "./shapes/index";');
    expect(out).not.toContain("refinements/index");
    expect(out).not.toContain("branded-primitive");
  });
});
