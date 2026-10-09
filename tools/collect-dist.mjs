#!/usr/bin/env node

import { copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rootDist = join(root, "dist");

mkdirSync(rootDist, { recursive: true });
const zetroAgentDist = join(rootDist, "apps", "zetro", "agent");
mkdirSync(zetroAgentDist, { recursive: true });
copyFileSync(join(root, "apps", "zetro", "agent", "skills.md"), join(zetroAgentDist, "skills.md"));

console.log(`Collected build output in ${rootDist}`);
