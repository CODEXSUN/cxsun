import { createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AppError } from "@cxsun/framework/errors";
import { platformDatabaseName } from "../../database/platform-database.js";
import { PlatformActivityService } from "../platform-activity/index.js";
import {
  appPrivateStorageRoot,
  storageDateFolder,
  storageShortTimestamp
} from "../storage-manager/storage-manager.paths.js";
import { DatabaseMaintenanceRepository } from "./database-maintenance.repository.js";
import { validateRestorableSql } from "./database-maintenance.executor.js";
import type { DatabaseMaintenanceRun } from "./database-maintenance.types.js";

export const masterBackupUploadLimit = 100 * 1024 * 1024;

export class MasterBackupFiles {
  constructor(
    private readonly repository = new DatabaseMaintenanceRepository(),
    private readonly activity = new PlatformActivityService()
  ) {}

  async list() {
    const runs = await this.repository.completedMasterBackups();
    return Promise.all(runs.map(async (run) => this.summary(run)));
  }

  async download(runId: number) {
    const run = await this.requireBackup(runId);
    const file = await verifiedMasterBackupFile(run);
    await this.activity.recordActivity({
      action: "database.master.backup-downloaded",
      details: { backupId: file.backupId, runId },
      moduleKey: "platform.database-maintenance",
      recordLabel: platformDatabaseName()
    });
    return {
      fileName: basename(file.path),
      sizeBytes: file.sizeBytes,
      stream: createReadStream(file.path)
    };
  }

  async selectForRestore(runId: number) {
    const run = await this.requireBackup(runId);
    return verifiedMasterBackupFile(run);
  }

  async upload(fileName: string, source: Readable) {
    if (
      !/^[^\\/]{1,160}\.sql$/iu.test(fileName) ||
      [...fileName].some((character) => character.charCodeAt(0) < 32)
    ) {
      throw AppError.validation("Choose a .sql backup file.");
    }
    const databaseName = platformDatabaseName();
    const backupId = `master-${databaseName}-upload-${storageShortTimestamp()}-${randomBytes(4).toString("hex")}`;
    const directory = join(masterBackupRoot(), storageDateFolder());
    const path = join(directory, `${backupId}.sql`);
    const partial = `${path}.part`;
    await mkdir(directory, { recursive: true, mode: 0o700 });

    const checksum = createHash("sha256");
    let sizeBytes = 0;
    const limit = new Transform({
      transform(chunk: Buffer, _encoding, done) {
        sizeBytes += chunk.byteLength;
        if (sizeBytes > masterBackupUploadLimit) {
          done(AppError.validation("SQL backup files must be 100 MB or smaller."));
          return;
        }
        checksum.update(chunk);
        done(null, chunk);
      }
    });

    try {
      await pipeline(source, limit, createWriteStream(partial, { flags: "wx", mode: 0o600 }));
      if (sizeBytes === 0) throw AppError.validation("The SQL backup file is empty.");
      validateRestorableSql(await readFile(partial, "utf8"), databaseName);
      await rename(partial, path);
    } catch (error) {
      await rm(partial, { force: true });
      throw error;
    }

    let run: DatabaseMaintenanceRun;
    try {
      run = await this.repository.recordRun({
        databaseName,
        details: {
          backupId,
          checksum: checksum.digest("hex"),
          fileName,
          filePath: path,
          sizeBytes,
          source: "uploaded",
          storage: "local-sql"
        },
        operation: "backup",
        scope: "master",
        status: "completed",
        targetKey: "master"
      });
    } catch (error) {
      await rm(path, { force: true });
      throw error;
    }
    await this.activity.recordActivity({
      action: "database.master.backup-uploaded",
      details: { backupId, fileName, runId: run.id, sizeBytes },
      moduleKey: "platform.database-maintenance",
      recordLabel: databaseName
    });
    return this.summary(run);
  }

  private async requireBackup(runId: number) {
    const run = await this.repository.findRun(runId);
    if (
      !run ||
      run.scope !== "master" ||
      run.targetKey !== "master" ||
      run.operation !== "backup" ||
      run.status !== "completed" ||
      run.databaseName !== platformDatabaseName()
    ) {
      throw AppError.notFound("Master backup was not found.");
    }
    return run;
  }

  private async summary(run: DatabaseMaintenanceRun) {
    const path = stringDetail(run.details.filePath);
    const fileName = stringDetail(run.details.fileName) || basename(path || "backup.sql");
    const info = path ? await stat(path).catch(() => null) : null;
    return {
      available: Boolean(info?.isFile()),
      backupId: stringDetail(run.details.backupId),
      createdAt: run.completedAt || run.createdAt,
      fileName,
      runId: run.id,
      sizeBytes: info?.size ?? Number(run.details.sizeBytes || 0),
      source: run.details.source === "uploaded" ? ("uploaded" as const) : ("generated" as const)
    };
  }
}

export async function verifiedMasterBackupFile(run: DatabaseMaintenanceRun) {
  if (
    run.scope !== "master" ||
    run.operation !== "backup" ||
    run.status !== "completed" ||
    run.databaseName !== platformDatabaseName()
  ) {
    throw AppError.validation("The selected file is not a completed master backup.");
  }
  const savedPath = stringDetail(run.details.filePath);
  const backupId = stringDetail(run.details.backupId);
  const expectedChecksum = stringDetail(run.details.checksum);
  if (!savedPath || !backupId || !expectedChecksum) {
    throw AppError.validation("The selected backup has no usable SQL file.");
  }
  const root = await realpath(masterBackupRoot());
  const path = await realpath(savedPath).catch(() => {
    throw AppError.notFound("The selected SQL backup file is missing.");
  });
  const segment = relative(root, path);
  if (!segment || segment === ".." || segment.startsWith(`..${sep}`) || isAbsolute(segment)) {
    throw AppError.validation("The selected backup is outside master backup storage.");
  }
  const info = await stat(path);
  if (!info.isFile()) throw AppError.validation("The selected backup is not a file.");
  const actualChecksum = createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
  if (actualChecksum !== expectedChecksum) {
    throw AppError.validation("The selected backup file failed its checksum check.");
  }
  return { backupId, path, sizeBytes: info.size };
}

function masterBackupRoot() {
  return join(appPrivateStorageRoot(), "database");
}

function stringDetail(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
