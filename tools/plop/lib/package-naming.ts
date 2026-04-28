export const PACKAGE_SCOPES = {
  core: "core",
  composition: "composition",
  driven: "driven",
} as const;

export function corePackageName(featureKebab: string): string {
  return `@${featureKebab}/${PACKAGE_SCOPES.core}`;
}

export function compositionPackageName(
  featureKebab: string,
  compositionAppKebab: string
): string {
  return `@${featureKebab}/${PACKAGE_SCOPES.composition}-${compositionAppKebab}`;
}

export function infrastructureDrivenPackageName(
  featureKebab: string,
  drivenKebab: string
): string {
  return `@${featureKebab}/${PACKAGE_SCOPES.driven}-${drivenKebab}`;
}

export const CORE_PACKAGE_NAME_RE = new RegExp(
  `^@[a-z0-9-]+${PACKAGE_SCOPES.core}$`
);

export const COMPOSITION_PACKAGE_NAME_RE = new RegExp(
  `^@[a-z0-9-]+-${PACKAGE_SCOPES.composition}/[a-z0-9-]+$`
);
