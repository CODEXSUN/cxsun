import assert from "node:assert/strict";
import { Kysely, MysqlDialect, sql } from "kysely";
import { createPool } from "mysql2";
import { createConnection } from "mysql2/promise";

process.loadEnvFile(".env");

const run = `${Date.now().toString(36)}${process.pid.toString(36)}`.slice(-12);
const blogDatabaseName = databaseName(`cxsun_blog_e2e_${run}`);
const databaseConfig = {
  host: requiredEnv("DB_HOST"),
  password: requiredEnv("DB_PASSWORD"),
  port: Number(requiredEnv("DB_PORT")),
  user: requiredEnv("DB_USER")
};
const admin = await createConnection(databaseConfig);
let blogDatabase: Kysely<Record<string, unknown>> | null = null;

try {
  await createDatabase(blogDatabaseName);
  blogDatabase = new Kysely({
    dialect: new MysqlDialect({
      pool: createPool({ ...databaseConfig, database: blogDatabaseName })
    })
  });

  const blog = await import("@codexsun/blog/api");
  const { rollbackMigrationBatch, runMigrationBatch } = await import("@cxsun/framework/db");
  const firstBlogMigration = await blog.migrateBlogsDatabase(
    blogDatabase as never,
    runMigrationBatch
  );
  const secondBlogMigration = await blog.migrateBlogsDatabase(
    blogDatabase as never,
    runMigrationBatch
  );
  assert.equal(firstBlogMigration.applied.length, blog.blogsMigrationBatch.steps.length);
  assert.equal(secondBlogMigration.skipped.length, blog.blogsMigrationBatch.steps.length);

  const context = {
    actorId: "system:addon-persistence-e2e",
    database: blogDatabase as never,
    host: "cxsun" as const,
    origin: "https://addon-persistence.test",
    scopeId: `e2e-${run}`
  };
  await blog.seedBlogsDatabase(context);
  const firstArticleCount = await countRows(blogDatabase, "blogs_articles");
  await blog.seedBlogsDatabase(context);
  assert.equal(await countRows(blogDatabase, "blogs_articles"), firstArticleCount);
  assert.ok(firstArticleCount > 0, "Blog owner seeds produced no articles.");
  await assert.rejects(
    rollbackMigrationBatch(blogDatabase, blog.blogsMigrationBatch as never),
    /has no safe rollback/iu
  );

  console.log("Add-on live migration E2E passed", {
    blogArticles: firstArticleCount,
    blogSteps: blog.blogsMigrationBatch.steps.length
  });
} finally {
  await blogDatabase?.destroy();
  await dropDatabase(blogDatabaseName);
  await admin.end();
}

async function countRows(database: Kysely<Record<string, unknown>>, table: string) {
  const result = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) AS count FROM ${sql.table(table)}`.execute(database);
  return Number(result.rows[0]?.count ?? 0);
}

async function createDatabase(name: string) {
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}

async function dropDatabase(name: string) {
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
}

function databaseName(value: string) {
  if (!/^cxsun_blog_e2e_[a-z0-9]+$/u.test(value)) {
    throw new Error(`Unsafe temporary database name: ${value}`);
  }
  return value;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for add-on persistence E2E.`);
  return value;
}
