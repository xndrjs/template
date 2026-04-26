const CORE_SUFFIX = "/core";

/**
 * `features/plop-demo/core` → `plop-demo` (feature folder name).
 */
export function featureSegmentFromCorePackageRel(
  corePackageRel: string
): string {
  if (!corePackageRel.endsWith(CORE_SUFFIX)) {
    throw new Error(
      `Expected core package path ending with /core, got: ${corePackageRel}`
    );
  }
  const base = corePackageRel.slice(0, -CORE_SUFFIX.length);
  const seg = base.split("/").filter(Boolean).pop();
  if (!seg) {
    throw new Error(
      `Could not infer feature folder from core path: ${corePackageRel}`
    );
  }
  return seg;
}

/**
 * `features/foo/core` + `web` → `features/foo/composition/web` (repo-relative POSIX path).
 */
export function compositionPackageRelFromCoreRel(
  corePackageRel: string,
  compositionAppKebab: string
): string {
  if (!corePackageRel.endsWith(CORE_SUFFIX)) {
    throw new Error(
      `Expected core package path ending with /core, got: ${corePackageRel}`
    );
  }
  const base = corePackageRel.slice(0, -CORE_SUFFIX.length);
  return `${base}/composition/${compositionAppKebab}`;
}
