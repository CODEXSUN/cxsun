import assert from "node:assert/strict";
import { createServer } from "node:net";

const port = await new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close(() => reject(new Error("Could not allocate a test port.")));
      return;
    }
    server.close((error) => (error ? reject(error) : resolve(address.port)));
  });
});
process.env.PLATFORM_API_PORT = String(port);
process.env.NODE_ENV = "development";
process.env.DEV_AUTO_TENANT_LOGIN = "1";

const { createApp } = await import("../../apps/platform/api/src/app.js");
const app = await createApp();

try {
  await app.listen({ host: "127.0.0.1", port });
  const origin = new URL(process.env.PLATFORM_WEB_ORIGIN ?? "http://app.codexsun.test");
  const login = await app.inject({
    method: "POST",
    url: "/auth/development/tenant-login",
    headers: { host: origin.host, origin: origin.origin }
  });
  assert.equal(login.statusCode, 200, `Development tenant login failed: ${login.body}`);
  const session = login.cookies.findLast(
    (cookie) => cookie.name.endsWith("cxsun_session") && cookie.value.length > 0
  );
  assert.ok(session?.value, "Tenant session cookie was not returned.");
  const headers = {
    host: origin.host,
    origin: origin.origin,
    cookie: `${session.name}=${session.value}`
  };
  const read = async (path: string) => {
    const response = await app.inject({ method: "GET", url: path, headers });
    assert.equal(response.statusCode, 200, `${path}: ${response.body}`);
    assert.ok(Array.isArray(response.json().data), `${path} did not return records.`);
    return response.json().data as Array<{ id: number }>;
  };
  const customers = await read("/core/master/contacts");
  const customerId = customers[0]?.id ?? 1;
  const people = await read(`/crm/contact-people?customerContactId=${customerId}`);
  const personId = people[0]?.id ?? 1;
  const routes = [
    `/crm/contact-profiles?coreContactId=${customerId}`,
    `/crm/contact-communication?personId=${personId}`,
    `/crm/contact-preferences?personId=${personId}`,
    `/crm/contact-employments?personId=${personId}`,
    `/crm/contact-roles?personId=${personId}`,
    `/crm/contact-relationships?customerContactId=${customerId}`,
    `/crm/contact-classifications?personId=${personId}`,
    "/crm/contact-tags",
    `/crm/contact-person-tags?personId=${personId}`,
    `/crm/contact-notes?personId=${personId}`,
    `/crm/contact-lifecycle?personId=${personId}`,
    `/crm/contact-documents?personId=${personId}`
  ];
  for (const route of routes) await read(route);
  if (customers[0]) {
    const { getTenantDatabaseByName } =
      await import("../../apps/platform/api/src/database/tenant-database.js");
    const { ContactPeopleRepository } =
      await import("../../apps/crm/api/src/modules/contact-people/contact-people.repository.js");
    const { ContactNotesRepository } =
      await import("../../apps/crm/api/src/modules/contact-notes/contact-notes.repository.js");
    const rollback = new Error("Rollback Contact 360 write smoke");
    try {
      await getTenantDatabaseByName(process.env.DEFAULT_TENANT_DB_NAME ?? "")
        .transaction()
        .execute(async (transaction) => {
          const person = await new ContactPeopleRepository(transaction as never).create(
            {
              customerContactId: customerId,
              firstName: "Contact 360 smoke",
              lastName: null,
              displayName: null,
              salutation: null,
              profilePhotoRef: null
            },
            "system:contact-360-smoke"
          );
          const note = await new ContactNotesRepository(transaction as never).create(
            {
              personId: person.id,
              noteType: "smoke",
              body: "Transaction rollback test",
              isImportant: false
            },
            "system:contact-360-smoke"
          );
          assert.equal(note.personId, person.id);
          throw rollback;
        });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  }
  console.log("Contact 360: Core lookup and all 13 CRM module reads passed.");
} finally {
  await app.close();
}
