import { createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AppError } from "@cxsun/framework/errors";
import {
  storageDateFolder,
  storageShortTimestamp,
  tenantPrivateStorageRoot
} from "../storage-manager/storage-manager.paths.js";
import { PlatformActivityService } from "../platform-activity/index.js";
import { DatabaseMaintenanceRepository } from "./database-maintenance.repository.js";
import { validateRestorableSql } from "./database-maintenance.executor.js";
import type { DatabaseMaintenanceRun } from "./database-maintenance.types.js";

const uploadLimit = 100 * 1024 * 1024;
type Tenant = NonNullable<Awaited<ReturnType<DatabaseMaintenanceRepository["findTenant"]>>>;

export class TenantBackupFiles {
  constructor(
    private readonly repository = new DatabaseMaintenanceRepository(),
    private readonly activity = new PlatformActivityService()
  ) {}

  async list(tenantId: number) {
    const tenant = await this.requireTenant(tenantId);
    const runs = await this.repository.completedTenantBackups(tenant.id);
    return Promise.all(runs.filter((run) => run.databaseName === tenant.dbName).map(summary));
  }

  async download(tenantId: number, runId: number) {
    const tenant = await this.requireTenant(tenantId);
    const file = await verifiedTenantBackupFile(await this.requireBackup(tenant, runId), tenant);
    await this.activity.recordActivity({
      action: "database.tenant.backup-downloaded",
      details: { backupId: file.backupId, runId },
      moduleKey: "platform.database-maintenance",
      recordId: tenant.id,
      recordLabel: tenant.tenantCode,
      recordUuid: tenant.uuid
    });
    return {
      fileName: basename(file.path),
      sizeBytes: file.sizeBytes,
      stream: createReadStream(file.path)
    };
  }

  async selectForRestore(tenant: Tenant, runId: number) {
    return verifiedTenantBackupFile(await this.requireBackup(tenant, runId), tenant);
  }

  async upload(tenantId: number, fileName: string, source: Readable) {
    const tenant = await this.requireTenant(tenantId);
    if (
      !/^[^\\/]{1,160}\.sql$/iu.test(fileName) ||
      [...fileName].some((char) => char.charCodeAt(0) < 32)
    ) {
      throw AppError.validation("Choose a .sql backup file.");
    }
    const backupId = `tenant-${tenant.id}-${storageShortTimestamp()}-${randomBytes(4).toString("hex")}`;
    const directory = join(tenantBackupRoot(tenant), storageDateFolder());
    const path = join(directory, `${backupId}.sql`);
    const partial = `${path}.part`;
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const checksum = createHash("sha256");
    let sizeBytes = 0;
    const limit = new Transform({
      transform(chunk: Buffer, _encoding, done) {
        sizeBytes += chunk.byteLength;
        if (sizeBytes > uploadLimit)
          return done(AppError.validation("SQL backup files must be 100 MB or smaller."));
        checksum.update(chunk);
        done(null, chunk);
      }
    });
    try {
      await pipeline(source, limit, createWriteStream(partial, { flags: "wx", mode: 0o600 }));
      if (sizeBytes === 0) throw AppError.validation("The SQL backup file is empty.");
      validateRestorableSql(await readFile(partial, "utf8"), tenant.dbName);
      await rename(partial, path);
    } catch (error) {
      await rm(partial, { force: true });
      throw error;
    }
    let run: DatabaseMaintenanceRun;
    try {
      run = await this.repository.recordRun({
        databaseName: tenant.dbName,
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
        scope: "tenant",
        status: "completed",
        targetKey: String(tenant.id)
      });
    } catch (error) {
      await rm(path, { force: true });
      throw error;
    }
    await this.activity.recordActivity({
      action: "database.tenant.backup-uploaded",
      details: { backupId, fileName, runId: run.id, sizeBytes },
      moduleKey: "platform.database-maintenance",
      recordId: tenant.id,
      recordLabel: tenant.tenantCode,
      recordUuid: tenant.uuid
    });
    return summary(run);
  }

  private async requireTenant(tenantId: number) {
    const tenant = await this.repository.findTenant(tenantId);
    if (!tenant) throw AppError.notFound("Tenant was not found.");
    return tenant;
  }

  private async requireBackup(tenant: Tenant, runId: number) {
    const run = await this.repository.findRun(runId);
    if (
      !run ||
      run.scope !== "tenant" ||
      run.targetKey !== String(tenant.id) ||
      run.operation !== "backup" ||
      run.status !== "completed" ||
      run.databaseName !== tenant.dbName
    ) {
      throw AppError.notFound("Tenant backup was not found.");
    }
    return run;
  }
}

export async function verifiedTenantBackupFile(run: DatabaseMaintenanceRun, tenant: Tenant) {
  if (
    run.scope !== "tenant" ||
    run.targetKey !== String(tenant.id) ||
    run.operation !== "backup" ||
    run.status !== "completed" ||
    run.databaseName !== tenant.dbName
  ) {
    throw AppError.validation("The selected file is not a completed backup for this tenant.");
  }
  const savedPath = stringDetail(run.details.filePath);
  const backupId = stringDetail(run.details.backupId);
  const expectedChecksum = stringDetail(run.details.checksum);
  if (!savedPath || !backupId || !expectedChecksum)
    throw AppError.validation("The selected backup has no usable SQL file.");
  const root = await realpath(tenantBackupRoot(tenant));
  const path = await realpath(savedPath).catch(() => {
    throw AppError.notFound("The selected SQL backup file is missing.");
  });
  const segment = relative(root, path);
  if (!segment || segment === ".." || segment.startsWith(`..${sep}`) || isAbsolute(segment)) {
    throw AppError.validation("The selected backup is outside this tenant's backup storage.");
  }
  const info = await stat(path);
  if (!info.isFile()) throw AppError.validation("The selected backup is not a file.");
  const actualChecksum = createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
  if (actualChecksum !== expectedChecksum)
    throw AppError.validation("The selected backup file failed its checksum check.");
  validateRestorableSql(await readFile(path, "utf8"), tenant.dbName);
  return { backupId, path, sizeBytes: info.size };
}

function tenantBackupRoot(tenant: Tenant) {
  return join(tenantPrivateStorageRoot(tenant.slug || tenant.tenantCode), "database");
}

async function summary(run: DatabaseMaintenanceRun) {
  const path = stringDetail(run.details.filePath);
  const info = path ? await stat(path).catch(() => null) : null;
  return {
    available: Boolean(info?.isFile()),
    backupId: stringDetail(run.details.backupId),
    createdAt: run.completedAt || run.createdAt,
    fileName: stringDetail(run.details.fileName) || basename(path || "backup.sql"),
    runId: run.id,
    sizeBytes: info?.size ?? Number(run.details.sizeBytes || 0),
    source: run.details.source === "uploaded" ? ("uploaded" as const) : ("generated" as const)
  };
}

function stringDetail(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
