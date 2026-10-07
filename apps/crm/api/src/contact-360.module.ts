import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import type { EnquiryDatabase } from "./modules/enquiry/index.js";
import { contactProfilesModule } from "./modules/contact-profiles/index.js";
import { contactPeopleModule, getActivePersonForDatabase } from "./modules/contact-people/index.js";
import type { ContactPeopleDatabase } from "./modules/contact-people/index.js";
import { contactCommunicationModule } from "./modules/contact-communication/index.js";
import { contactPreferencesModule } from "./modules/contact-preferences/index.js";
import { contactEmploymentsModule } from "./modules/contact-employments/index.js";
import { contactRolesModule } from "./modules/contact-roles/index.js";
import { contactRelationshipsModule } from "./modules/contact-relationships/index.js";
import { contactClassificationsModule } from "./modules/contact-classifications/index.js";
import { contactTagsModule, getActiveTagForDatabase } from "./modules/contact-tags/index.js";
import type { ContactTagsDatabase } from "./modules/contact-tags/index.js";
import { contactPersonTagsModule } from "./modules/contact-person-tags/index.js";
import { contactNotesModule } from "./modules/contact-notes/index.js";
import { contactLifecycleModule } from "./modules/contact-lifecycle/index.js";
import { contactDocumentsModule } from "./modules/contact-documents/index.js";

export type Contact360HostContext = {
  database: Kysely<EnquiryDatabase>;
  actorEmail: string;
  customerExists: (id: number) => Promise<boolean>;
  industryExists: (id: number) => Promise<boolean>;
};

export function registerContact360Modules(
  app: FastifyInstance,
  host: (request: FastifyRequest, resource: string) => Promise<Contact360HostContext>
) {
  const scope =
    (resource: string, parent: "customer" | "person" | "none") =>
    async (request: FastifyRequest) => {
      const context = await host(request, resource);
      const parentExists =
        parent === "customer"
          ? context.customerExists
          : parent === "person"
            ? async (id: number) =>
                Boolean(
                  await getActivePersonForDatabase(
                    context.database as unknown as Kysely<ContactPeopleDatabase>,
                    id
                  )
                )
            : async (_id: number) => true;
      const personCustomer = async (id: number) =>
        (
          await getActivePersonForDatabase(
            context.database as unknown as Kysely<ContactPeopleDatabase>,
            id
          )
        )?.customerContactId ?? null;
      const tagExists = async (id: number) =>
        Boolean(
          await getActiveTagForDatabase(
            context.database as unknown as Kysely<ContactTagsDatabase>,
            id
          )
        );
      return {
        database: context.database as never,
        actorEmail: context.actorEmail,
        parentExists,
        personCustomer,
        tagExists,
        industryExists: context.industryExists
      };
    };
  contactProfilesModule.register(app, scope("contact-profiles", "customer"));
  contactPeopleModule.register(app, scope("contact-people", "customer"));
  contactCommunicationModule.register(app, scope("contact-communication", "person"));
  contactPreferencesModule.register(app, scope("contact-preferences", "person"));
  contactEmploymentsModule.register(app, scope("contact-employments", "person"));
  contactRolesModule.register(app, scope("contact-roles", "person"));
  contactRelationshipsModule.register(app, scope("contact-relationships", "customer"));
  contactClassificationsModule.register(app, scope("contact-classifications", "person"));
  contactTagsModule.register(app, scope("contact-tags", "none"));
  contactPersonTagsModule.register(app, scope("contact-person-tags", "person"));
  contactNotesModule.register(app, scope("contact-notes", "person"));
  contactLifecycleModule.register(app, scope("contact-lifecycle", "person"));
  contactDocumentsModule.register(app, scope("contact-documents", "person"));
}
