#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { HostingerSshService } from "./hostinger-ssh.service.mjs";

const action = process.argv[2];
if (!["status", "bootstrap", "sync"].includes(action)) {
  console.error(
    "Usage: npm run hostinger:status | hostinger:bootstrap | hostinger:sync -- --ref SHA"
  );
  process.exitCode = 64;
} else {
  try {
    const target = JSON.parse(await readFile(new URL("../target.json", import.meta.url), "utf8"));
    const service = new HostingerSshService(target);
    const result =
      action === "bootstrap"
        ? await service.prepareCheckout()
        : action === "sync"
          ? await service.syncCheckout(process.argv[3] === "--ref" ? process.argv[4] : "")
          : await service.status();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(
      `Hostinger SSH status failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}
