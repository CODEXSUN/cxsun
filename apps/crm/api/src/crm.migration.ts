import type { Kysely } from "kysely";
import { contact360MigrationBatches, migrateContact360Database } from "./contact-360.migration.js";
import {
  enquiryMigrationBatch,
  migrateCrmTenantDatabase as migrateEnquiryDatabase,
  rollbackCrmTenantDatabase as rollbackEnquiryDatabase
} from "./modules/enquiry/index.js";
import type { EnquiryDatabase } from "./modules/enquiry/index.js";
import { listinMigrationBatch, migrateListInMaster } from "./modules/list-in/index.js";
import type { ListInDatabase } from "./modules/list-in/index.js";
import { statusMigrationBatch, migrateStatusMaster } from "./modules/status/index.js";
import type { StatusDatabase } from "./modules/status/index.js";
import { priorityMigrationBatch, migratePriorityMaster } from "./modules/priority/index.js";
import type { PriorityDatabase } from "./modules/priority/index.js";

const batches = [
  listinMigrationBatch,
  statusMigrationBatch,
  priorityMigrationBatch,
  enquiryMigrationBatch,
  ...contact360MigrationBatches
];

export const crmTenantMigrations = batches.flatMap((batch) =>
  batch.steps.map(({ description, name }) => ({ description, name }))
);

export async function migrateCrmTenantDatabase(database: Kysely<EnquiryDatabase>) {
  await migrateListInMaster(database as unknown as Kysely<ListInDatabase>);
  await migrateStatusMaster(database as unknown as Kysely<StatusDatabase>);
  await migratePriorityMaster(database as unknown as Kysely<PriorityDatabase>);
  await migrateEnquiryDatabase(database);
  return migrateContact360Database(database);
}

export const rollbackCrmTenantDatabase = rollbackEnquiryDatabase;
