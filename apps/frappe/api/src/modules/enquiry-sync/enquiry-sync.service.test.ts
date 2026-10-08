import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Kysely } from "kysely";
import type { EnquiryInput, EnquiryRecord } from "@cxsun/crm-api/enquiry-sync";
import type { FrappeDatabase } from "../connection/index.js";
import { FrappeEnquirySyncService } from "./enquiry-sync.service.js";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const defaults = {
  baseUrl: "https://frappe.example.com/",
  apiKey: "key",
  apiSecret: "secret",
  enabled: true
};

function database(link?: {
  enquiryId: number;
  syncedAt: string;
  updatedAt: string;
  source: string;
  contactId: number | null;
  assignedUserId: number | null;
  listInId: number | null;
}) {
  let saved = false;
  const query = (table: string) => {
    const builder = {
      selectAll: () => builder,
      select: () => builder,
      where: () => builder,
      innerJoin: () => builder,
      execute: async () => [],
      executeTakeFirst: async () => {
        if (table === "frappe_connection_settings") return null;
        if (table === "frappe_enquiry_sync as sync") return link ?? null;
        if (table === "crm_enquiry_statuses") return { id: 2, code: "new" };
        if (table === "crm_enquiry_priorities") return { id: 3 };
        return null;
      }
    };
    return builder;
  };
  const insert = {
    values: () => insert,
    onDuplicateKeyUpdate: () => insert,
    execute: async () => {
      saved = true;
    }
  };
  return {
    value: {
      selectFrom: query,
      insertInto: () => insert
    } as unknown as Kysely<FrappeDatabase>,
    wasSaved: () => saved
  };
}

test("previews remote enquiries and their local link", async () => {
  const scope = database();
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ data: [{ name: "ENQ27", title: "Machine issue", date: "2026-10-06" }] }),
      {
        status: 200
      }
    );
  const service = new FrappeEnquirySyncService(
    {
      database: scope.value,
      createEnquiry: async () => {
        throw new Error("Unexpected create");
      },
      updateEnquiry: async () => {
        throw new Error("Unexpected update");
      },
      localUserForEmployee: async () => null
    },
    defaults,
    "secret"
  );
  assert.deepEqual(await service.preview(), [
    {
      name: "ENQ27",
      title: "Machine issue",
      mobile: null,
      date: "2026-10-06",
      status: null,
      priority: null,
      modifiedAt: null,
      localEnquiryId: null
    }
  ]);
});

test("pull creates a local enquiry and records the remote identity", async () => {
  const scope = database();
  const created: EnquiryInput[] = [];
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: {
          name: "ENQ27",
          title: "Machine issue",
          enquiry_details: "Machine stopped",
          mobile: "9994885548",
          user_employee: "HR-EMP-00011",
          date: "2026-10-06",
          status: "New",
          priority: "Normal"
        }
      }),
      { status: 200 }
    );
  const service = new FrappeEnquirySyncService(
    {
      database: scope.value,
      createEnquiry: async (input) => {
        created.push(input);
        return { id: 42 } as EnquiryRecord;
      },
      updateEnquiry: async () => {
        throw new Error("Unexpected update");
      },
      localUserForEmployee: async (employeeCode) => {
        assert.equal(employeeCode, "HR-EMP-00011");
        return 7;
      }
    },
    defaults,
    "secret"
  );
  assert.deepEqual(await service.pull("ENQ27"), {
    remoteName: "ENQ27",
    enquiryId: 42,
    status: "created"
  });
  assert.equal(created[0]?.source, "frappe");
  assert.equal(created[0]?.sourceReference, "ENQ27");
  assert.equal(created[0]?.statusId, 2);
  assert.equal(created[0]?.assignedUserId, 7);
  assert.equal(scope.wasSaved(), true);
});

test("pull rejects a linked enquiry with newer local edits", async () => {
  const scope = database({
    enquiryId: 42,
    syncedAt: "2026-10-06 10:00:00",
    updatedAt: "2026-10-06 11:00:00",
    source: "frappe",
    contactId: null,
    assignedUserId: null,
    listInId: null
  });
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ data: { name: "ENQ27" } }), { status: 200 });
  const service = new FrappeEnquirySyncService(
    {
      database: scope.value,
      createEnquiry: async () => {
        throw new Error("Unexpected create");
      },
      updateEnquiry: async () => {
        throw new Error("Unexpected update");
      },
      localUserForEmployee: async () => null
    },
    defaults,
    "secret"
  );
  await assert.rejects(() => service.pull("ENQ27"), /local enquiry changed/i);
  assert.equal(scope.wasSaved(), false);
});
