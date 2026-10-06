import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

for (const directory of ["platform-registry-json"]) {
  const source = fileURLToPath(new URL(`../devkits/project-manager/api/${directory}/`, import.meta.url));
  const target = fileURLToPath(new URL(`../dist/apps/project-manager/api/${directory}/`, import.meta.url));
  await mkdir(target, { recursive: true });
  await cp(source, target, { force: true, recursive: true });
  console.info(`[assets] Project Manager ${directory} copied to ${target}`);
}
