import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

export async function captureApiInputs(root) {
  const files = new Map();
  await captureDirectory(root, join(root, "apps/platform/api/src"), files);
  await captureFile(root, join(root, ".env"), files);
  return files;
}

export function changedApiInputs(previous, current) {
  return [...new Set([...previous.keys(), ...current.keys()])]
    .filter((path) => previous.get(path) !== current.get(path))
    .sort();
}

async function captureDirectory(root, directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await captureDirectory(root, path, files);
    else if (entry.isFile()) await captureFile(root, path, files);
  }
}

async function captureFile(root, path, files) {
  try {
    const content = await readFile(path);
    files.set(
      relative(root, path).replaceAll("\\", "/"),
      createHash("sha256").update(content).digest("hex")
    );
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
