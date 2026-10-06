import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveProjectManagerSeedDirectory(moduleUrl: string, directory: string) {
  const moduleDirectory = dirname(fileURLToPath(moduleUrl));
  const candidates = [
    join(moduleDirectory, "../../../", directory),
    join(process.cwd(), "devkits/project-manager/api", directory),
    join(process.cwd(), "dist/apps/project-manager/api", directory),
    join(moduleDirectory, "../../../../src/api", directory)
  ];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) {
    throw new Error(`Project Manager seed directory is unavailable: ${directory}.`);
  }
  return resolved;
}
