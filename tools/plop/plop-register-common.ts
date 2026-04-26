import type { NodePlopAPI } from "node-plop";
import { getRepoRoot } from "./lib/repo-root.ts";
import { resolveWorkspaceDependencyVersion } from "./lib/workspace-dependency-version.ts";

export function applyCommonPlopSetup(plop: NodePlopAPI) {
  const repoRoot = getRepoRoot();
  plop.setHelper("workspaceDependencyVersion", (depName: unknown) => {
    const resolved = resolveWorkspaceDependencyVersion(
      repoRoot,
      String(depName)
    );
    if (!resolved) {
      throw new Error(
        `Could not resolve a workspace version for dependency "${depName}"`
      );
    }
    return resolved;
  });
}
