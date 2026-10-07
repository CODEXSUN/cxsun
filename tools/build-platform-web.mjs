#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const result = spawnSync(
  process.execPath,
  [resolve(root, "node_modules/vite/bin/vite.js"), "build", ...process.argv.slice(2)],
  {
    cwd: resolve(root, "apps/platform/web"),
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "inherit"
  }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
