import type { Kysely } from "kysely";
import type { EnquiryDatabase } from "./modules/enquiry/index.js";
import {
  contactProfilesMigrationBatch,
  migrateContactProfiles
} from "./modules/contact-profiles/index.js";
import {
  contactPeopleMigrationBatch,
  migrateContactPeople
} from "./modules/contact-people/index.js";
import {
  contactCommunicationMigrationBatch,
  migrateContactCommunication
} from "./modules/contact-communication/index.js";
import {
  contactPreferencesMigrationBatch,
  migrateContactPreferences
} from "./modules/contact-preferences/index.js";
import {
  contactEmploymentsMigrationBatch,
  migrateContactEmployments
} from "./modules/contact-employments/index.js";
import { contactRolesMigrationBatch, migrateContactRoles } from "./modules/contact-roles/index.js";
import {
  contactRelationshipsMigrationBatch,
  migrateContactRelationships
} from "./modules/contact-relationships/index.js";
import {
  contactClassificationsMigrationBatch,
  migrateContactClassifications
} from "./modules/contact-classifications/index.js";
import { contactTagsMigrationBatch, migrateContactTags } from "./modules/contact-tags/index.js";
import {
  contactPersonTagsMigrationBatch,
  migrateContactPersonTags
} from "./modules/contact-person-tags/index.js";
import { contactNotesMigrationBatch, migrateContactNotes } from "./modules/contact-notes/index.js";
import {
  contactLifecycleMigrationBatch,
  migrateContactLifecycle
} from "./modules/contact-lifecycle/index.js";
import {
  contactDocumentsMigrationBatch,
  migrateContactDocuments
} from "./modules/contact-documents/index.js";

export const contact360MigrationBatches = [
  contactProfilesMigrationBatch,
  contactPeopleMigrationBatch,
  contactCommunicationMigrationBatch,
  contactPreferencesMigrationBatch,
  contactEmploymentsMigrationBatch,
  contactRolesMigrationBatch,
  contactRelationshipsMigrationBatch,
  contactClassificationsMigrationBatch,
  contactTagsMigrationBatch,
  contactPersonTagsMigrationBatch,
  contactNotesMigrationBatch,
  contactLifecycleMigrationBatch,
  contactDocumentsMigrationBatch
];

export async function migrateContact360Database(database: Kysely<EnquiryDatabase>) {
  await migrateContactProfiles(database as never);
  await migrateContactPeople(database as never);
  await migrateContactCommunication(database as never);
  await migrateContactPreferences(database as never);
  await migrateContactEmployments(database as never);
  await migrateContactRoles(database as never);
  await migrateContactRelationships(database as never);
  await migrateContactClassifications(database as never);
  await migrateContactTags(database as never);
  await migrateContactPersonTags(database as never);
  await migrateContactNotes(database as never);
  await migrateContactLifecycle(database as never);
  await migrateContactDocuments(database as never);
}
