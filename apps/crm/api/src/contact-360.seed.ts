import type { Kysely } from "kysely";
import type { EnquiryDatabase } from "./modules/enquiry/index.js";
import { seedContactProfiles } from "./modules/contact-profiles/index.js";
import { seedContactPeople } from "./modules/contact-people/index.js";
import { seedContactCommunication } from "./modules/contact-communication/index.js";
import { seedContactPreferences } from "./modules/contact-preferences/index.js";
import { seedContactEmployments } from "./modules/contact-employments/index.js";
import { seedContactRoles } from "./modules/contact-roles/index.js";
import { seedContactRelationships } from "./modules/contact-relationships/index.js";
import { seedContactClassifications } from "./modules/contact-classifications/index.js";
import { seedContactTags } from "./modules/contact-tags/index.js";
import { seedContactPersonTags } from "./modules/contact-person-tags/index.js";
import { seedContactNotes } from "./modules/contact-notes/index.js";
import { seedContactLifecycle } from "./modules/contact-lifecycle/index.js";
import { seedContactDocuments } from "./modules/contact-documents/index.js";

export async function seedContact360Database(database: Kysely<EnquiryDatabase>) {
  await seedContactProfiles(database as never);
  await seedContactPeople(database as never);
  await seedContactCommunication(database as never);
  await seedContactPreferences(database as never);
  await seedContactEmployments(database as never);
  await seedContactRoles(database as never);
  await seedContactRelationships(database as never);
  await seedContactClassifications(database as never);
  await seedContactTags(database as never);
  await seedContactPersonTags(database as never);
  await seedContactNotes(database as never);
  await seedContactLifecycle(database as never);
  await seedContactDocuments(database as never);
}
