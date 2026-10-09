import { createHash } from "node:crypto";
import { AppError } from "@cxsun/framework/errors";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createConnection } from "mysql2/promise";
import { env } from "../../env.js";
import { assertDatabaseName, quoteIdentifier } from "../../database/database-utils.js";
import { databaseBackupPath } from "../storage-manager/storage-manager.paths.js";

export type DatabaseExecutionTarget = {
  databaseName: string;
  host: string;
  password: string;
  port: number;
  tenantKey?: string;
  user: string;
};

export async function executeDatabaseBackup(input: {
  operation: string;
  runId: number;
  scope: string;
  target: DatabaseExecutionTarget;
}) {
  const databaseName = assertDatabaseName(input.target.databaseName);
  const backup = databaseBackupPath({
    databaseName,
    runId: input.runId,
    scope: input.scope === "tenant" ? "tenant" : "master",
    ...(input.target.tenantKey ? { tenantKey: input.target.tenantKey } : {})
  });
  await mkdir(dirname(backup.filePath), { recursive: true });

  const sqlDump = await createSqlDump(input.target);
  await writeFile(backup.filePath, sqlDump, "utf8");
  const file = await stat(backup.filePath);
  const checksum = createHash("sha256").update(sqlDump).digest("hex");

  return {
    backupId: backup.backupId,
    checksum,
    filePath: backup.filePath,
    sizeBytes: file.size,
    storage: "local-sql",
    verifiedAt: new Date().toISOString()
  };
}

export async function executeDatabaseRestore(input: {
  backupPath: string;
  liveRestoreConfirm?: string;
  operation: string;
  restoreMode?: string;
  sandboxMode?: "fresh" | "append";
  sandboxName?: string;
  runId: number;
  scope: string;
  target: DatabaseExecutionTarget;
}) {
  const liveRestore = input.restoreMode === "live";
  const restoreDatabaseName = liveRestore
    ? liveRestoreName(input.target.databaseName, input.liveRestoreConfirm)
    : input.sandboxName || restoreSandboxName(input.target.databaseName);
  assertDatabaseName(restoreDatabaseName);
  if (
    !liveRestore &&
    restoreDatabaseName.toLowerCase() === input.target.databaseName.toLowerCase()
  ) {
    throw AppError.validation("The restore sandbox must be different from the live database.");
  }
  const dump = await readFile(resolve(input.backupPath), "utf8");
  validateRestorableSql(dump, input.target.databaseName);
  if (liveRestore) {
    throw AppError.validation("Database backup restores must use a sandbox database.");
  }
  const connection = await createConnection({
    host: input.target.host,
    password: input.target.password,
    port: input.target.port,
    timezone: "Z",
    user: input.target.user
  });

  const sandboxMode = input.sandboxMode || "fresh";
  let insertedRows = 0;
  let restoreLock: string | null = null;
  try {
    {
      const lockName = `cxsun-restore-${createHash("sha256").update(restoreDatabaseName).digest("hex").slice(0, 32)}`;
      const [rows] = await connection.query("SELECT GET_LOCK(?, 0) AS acquired", [lockName]);
      if (!Array.isArray(rows) || Number((rows[0] as { acquired?: number })?.acquired) !== 1) {
        throw AppError.conflict("Another restore is running for this sandbox.");
      }
      restoreLock = lockName;
    }
    if (sandboxMode === "append") {
      insertedRows = await appendToSandbox(connection, restoreDatabaseName, dump);
    } else {
      await restoreMasterFresh(connection, restoreDatabaseName, dump, input.runId);
    }
  } finally {
    try {
      if (restoreLock) await connection.query("SELECT RELEASE_LOCK(?)", [restoreLock]);
    } finally {
      await connection.end();
    }
  }

  return {
    restoredAt: new Date().toISOString(),
    restoredDatabaseName: restoreDatabaseName,
    sandboxMode,
    insertedRows,
    sandboxOnly: !liveRestore,
    sourceBackupPath: resolve(input.backupPath)
  };
}

async function restoreMasterFresh(
  connection: Awaited<ReturnType<typeof createConnection>>,
  sandboxName: string,
  dump: string,
  runId: number
) {
  const stagingName = assertDatabaseName(
    `${sandboxName.slice(0, 42)}_stage_${runId}`,
    "restore staging database name"
  );
  const [existing] = await connection.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?",
    [stagingName]
  );
  if (Array.isArray(existing) && existing.length > 0) {
    throw AppError.conflict("A restore staging database already exists for this job.");
  }
  await connection.query(
    `CREATE DATABASE ${quoteIdentifier(stagingName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  try {
    await restoreFresh(connection, stagingName, dump, false);
    await restoreFresh(connection, sandboxName, dump, true);
  } finally {
    await connection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(stagingName)}`);
  }
}

async function restoreFresh(
  connection: Awaited<ReturnType<typeof createConnection>>,
  databaseName: string,
  dump: string,
  replaceSandbox: boolean
) {
  if (replaceSandbox)
    await connection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.query(`USE ${quoteIdentifier(databaseName)}`);
  await connection.query("SET FOREIGN_KEY_CHECKS=0");
  try {
    for (const statement of splitSqlStatements(dump)) {
      const sql = stripBackupHeader(statement);
      if (!sql || /^CREATE DATABASE|^USE /i.test(sql)) continue;
      await connection.query(sql);
    }
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS=1");
  }
}

async function appendToSandbox(
  connection: Awaited<ReturnType<typeof createConnection>>,
  databaseName: string,
  dump: string
) {
  const tables = [...dump.matchAll(/(?:^|\n)CREATE TABLE `([a-zA-Z0-9_]+)`\s*\(/g)].map(
    (match) => match[1]
  );
  if (tables.length === 0) throw AppError.validation("The backup contains no appendable tables.");
  const [rows] = await connection.query(
    "SELECT table_name, engine FROM information_schema.tables WHERE table_schema = ?",
    [databaseName]
  );
  const existing = new Map(
    (rows as Array<{ table_name: string; engine: string }>).map((row) => [
      row.table_name.toLowerCase(),
      row.engine
    ])
  );
  if (existing.size === 0) {
    throw AppError.validation("Append requires an existing sandbox. Run Fresh restore first.");
  }
  for (const table of tables) {
    const engine = existing.get(table!.toLowerCase());
    if (!engine)
      throw AppError.validation(`Sandbox table ${table} is missing. Run Fresh restore first.`);
    if (engine.toLowerCase() !== "innodb") {
      throw AppError.validation(`Sandbox table ${table} does not support an atomic append.`);
    }
  }
  await connection.query(`USE ${quoteIdentifier(databaseName)}`);
  await connection.beginTransaction();
  let insertedRows = 0;
  try {
    for (const statement of splitSqlStatements(dump)) {
      const sql = stripBackupHeader(statement);
      if (!/^INSERT INTO `[a-zA-Z0-9_]+`\s*\(/i.test(sql)) continue;
      const [result] = await connection.query(sql);
      insertedRows +=
        "affectedRows" in (result as object)
          ? Number((result as { affectedRows: number }).affectedRows)
          : 0;
    }
    await connection.commit();
    return insertedRows;
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

export function validateRestorableSql(dump: string, expectedDatabaseName: string) {
  const databaseName = assertDatabaseName(expectedDatabaseName);
  const header = `-- CODEXSUN database backup\n-- database: ${databaseName}\n`;
  if (!dump.replace(/\r\n/g, "\n").startsWith(header)) {
    throw AppError.validation(`Choose a CODEXSUN SQL backup for ${databaseName}.`);
  }
  let tableCount = 0;
  for (const statement of splitSqlStatements(dump)) {
    const sql = stripBackupHeader(statement);
    if (!sql) continue;
    if (/^CREATE TABLE `[a-zA-Z0-9_]+`\s*\(/i.test(sql)) {
      tableCount += 1;
      continue;
    }
    if (
      /^DROP TABLE IF EXISTS `[a-zA-Z0-9_]+`\s*;?$/i.test(sql) ||
      /^INSERT INTO `[a-zA-Z0-9_]+`\s*\(/i.test(sql) ||
      /^SET FOREIGN_KEY_CHECKS=[01]\s*;?$/i.test(sql) ||
      sql.startsWith(`USE \`${databaseName}\``) ||
      sql.startsWith(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``)
    )
      continue;
    throw AppError.validation("The SQL backup contains an unsupported statement.");
  }
  if (tableCount === 0) throw AppError.validation("The SQL backup contains no tables.");
}

function stripBackupHeader(statement: string) {
  return statement.replace(/^(?:\s*--[^\n]*(?:\n|$))*/, "").trim();
}

function liveRestoreName(sourceDatabaseName: string, confirmation: string | undefined) {
  if (
    env.CXSUN_ALLOW_LIVE_RESTORE !== "1" ||
    env.CXSUN_LIVE_RESTORE_CONFIRM !== "ALLOW_LIVE_RESTORE"
  ) {
    throw new Error(
      "Live restore is disabled. Set CXSUN_ALLOW_LIVE_RESTORE=1 and CXSUN_LIVE_RESTORE_CONFIRM=ALLOW_LIVE_RESTORE only during an approved restore window."
    );
  }
  const databaseName = assertDatabaseName(sourceDatabaseName, "live restore database name");
  if (confirmation !== `RESTORE ${databaseName}`) {
    throw new Error(`Live restore requires confirmation: RESTORE ${databaseName}`);
  }
  return databaseName;
}

export function restoreSandboxName(sourceDatabaseName: string) {
  if (env.NODE_ENV === "production" && !env.CXSUN_RESTORE_TEST_DB_NAME) {
    throw new Error("Production restore requires CXSUN_RESTORE_TEST_DB_NAME.");
  }
  const sandboxName = assertDatabaseName(
    env.CXSUN_RESTORE_TEST_DB_NAME || `${sourceDatabaseName}_restore_sandbox`,
    "restore sandbox database name"
  );
  if (sandboxName.toLowerCase() === sourceDatabaseName.toLowerCase()) {
    throw AppError.validation("The restore sandbox must be different from the live database.");
  }
  return sandboxName;
}

async function createSqlDump(target: DatabaseExecutionTarget) {
  const databaseName = assertDatabaseName(target.databaseName);
  const connection = await createConnection({
    database: databaseName,
    host: target.host,
    password: target.password,
    port: target.port,
    timezone: "Z",
    user: target.user
  });

  try {
    const [tableRows] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tableNames = Array.isArray(tableRows)
      ? tableRows
          .map((row) => String(Object.values(row as Record<string, unknown>)[0]))
          .filter(Boolean)
      : [];
    const chunks = [
      `-- CODEXSUN database backup`,
      `-- database: ${databaseName}`,
      `-- created_at: ${new Date().toISOString()}`,
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
      `USE ${quoteIdentifier(databaseName)};`,
      `SET FOREIGN_KEY_CHECKS=0;`
    ];

    for (const tableName of tableNames) {
      const safeTableName = assertDatabaseName(tableName, "table name");
      const [createRows] = await connection.query(
        `SHOW CREATE TABLE ${quoteIdentifier(safeTableName)}`
      );
      const createSql = String(
        (createRows as Array<Record<string, unknown>>)[0]?.["Create Table"] ?? ""
      );
      chunks.push(`DROP TABLE IF EXISTS ${quoteIdentifier(safeTableName)};`, `${createSql};`);

      const [rows] = await connection.query(`SELECT * FROM ${quoteIdentifier(safeTableName)}`);
      if (Array.isArray(rows) && rows.length > 0) {
        const columns = Object.keys(rows[0] as Record<string, unknown>)
          .map(quoteIdentifier)
          .join(", ");
        for (const row of rows as Array<Record<string, unknown>>) {
          const values = Object.values(row).map(sqlValue).join(", ");
          chunks.push(
            `INSERT INTO ${quoteIdentifier(safeTableName)} (${columns}) VALUES (${values});`
          );
        }
      }
    }

    chunks.push("SET FOREIGN_KEY_CHECKS=1;", "");
    return chunks.join("\n");
  } finally {
    await connection.end();
  }
}

function sqlValue(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date)
    return `'${escapeSql(value.toISOString().slice(0, 19).replace("T", " "))}'`;
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  if (typeof value === "object") return `'${escapeSql(JSON.stringify(value))}'`;
  return `'${escapeSql(String(value))}'`;
}

function escapeSql(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    current += char;
    if (char === "'" && next !== "'") inString = !inString;
    if (char === "'" && next === "'") {
      current += next;
      index += 1;
      continue;
    }
    if (char === ";" && !inString) {
      statements.push(current);
      current = "";
    }
  }
  if (current.trim()) statements.push(current);
  return statements;
}
