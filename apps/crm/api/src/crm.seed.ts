import type { Kysely } from "kysely";
import { seedContact360Database } from "./contact-360.seed.js";
import { seedEnquiryModule } from "./modules/enquiry/index.js";
import type { EnquiryDatabase } from "./modules/enquiry/index.js";
import { seedListInMaster } from "./modules/list-in/index.js";
import type { ListInDatabase } from "./modules/list-in/index.js";
import { seedStatusMaster } from "./modules/status/index.js";
import type { StatusDatabase } from "./modules/status/index.js";
import { seedPriorityMaster } from "./modules/priority/index.js";
import type { PriorityDatabase } from "./modules/priority/index.js";

export async function seedCrmTenantDatabase(database: Kysely<EnquiryDatabase>) {
  await seedListInMaster(database as unknown as Kysely<ListInDatabase>);
  await seedStatusMaster(database as unknown as Kysely<StatusDatabase>);
  await seedPriorityMaster(database as unknown as Kysely<PriorityDatabase>);
  await seedEnquiryModule(database);
  await seedContact360Database(database);
}
