import assert from "node:assert/strict";
import { test } from "node:test";
import { EnquiryService, type EnquiryRelations } from "./enquiry.service.js";
import type { EnquiryRepository } from "./enquiry.repository.js";
import type { EnquiryInput, EnquiryListOptions, EnquiryRecord } from "./enquiry.types.js";

const statuses = new Map([
  [1, { name: "New", code: "new" }],
  [2, { name: "Open", code: "open" }],
  [3, { name: "Won", code: "won" }],
  [4, { name: "Re-open", code: "reopen" }]
]);

function record(statusId = 2): EnquiryRecord {
  return {
    id: 7,
    uuid: "12345678",
    enquiryNo: 7,
    title: "Test enquiry",
    description: "Test enquiry",
    contactId: 1,
    contactName: "Customer",
    capturedName: "Customer",
    capturedEmail: null,
    capturedPhone: null,
    source: "manual",
    sourceReference: null,
    listInId: null,
    listIn: null,
    statusId,
    status: statuses.get(statusId)?.code ?? "open",
    statusName: statuses.get(statusId)?.name ?? "Open",
    priorityId: 1,
    priority: "normal",
    priorityName: "Normal",
    assignedUserId: 2,
    enquiredAt: "2026-10-07T00:00:00.000Z",
    dueDate: null,
    closedReason: statusId === 3 ? "Customer accepted" : null,
    createdBy: "creator@example.com",
    createdAt: "2026-10-07T00:00:00.000Z",
    updatedAt: "2026-10-07T00:00:00.000Z"
  };
}

const relations: EnquiryRelations = {
  contact: async () => ({ name: "Customer" }),
  resolveOrCreateCustomer: async () => ({ id: 1, name: "Customer" }),
  user: async () => ({ name: "User" }),
  listIn: async () => ({ name: "List" }),
  status: async (id) => statuses.get(id) ?? null,
  priority: async () => ({ name: "Normal" })
};

test("list scope and detail access use the server actor", async () => {
  let options: EnquiryListOptions | undefined;
  const repository = {
    listPage: async (input: EnquiryListOptions) => {
      options = input;
      return { items: [], total: 0, statusCounts: [] };
    },
    get: async () => record()
  } as unknown as EnquiryRepository;
  const viewer = { actorEmail: "other@example.com", actorUserId: 3, canViewAll: false };
  const service = new EnquiryService(repository, relations, viewer);

  await service.listPage({ scope: "assigned", page: 1, pageSize: 100, search: "", filter: "all" });
  assert.equal(options?.actorUserId, 3);
  assert.equal(options?.scope, "assigned");
  await assert.rejects(service.get(7), /cannot view this enquiry/i);
});

test("report uses the same server actor and all-enquiries scope", async () => {
  let options: EnquiryListOptions | undefined;
  const repository = {
    report: async (input: EnquiryListOptions) => {
      options = input;
      return [];
    }
  } as unknown as EnquiryRepository;
  const viewer = { actorEmail: "creator@example.com", actorUserId: 2, canViewAll: false };
  const service = new EnquiryService(repository, relations, viewer);
  await service.report({ fromAt: "2026-09-30T18:30:00.000Z", assignedUserId: "3" });
  assert.equal(options?.scope, "all");
  assert.equal(options?.actorEmail, viewer.actorEmail);
  assert.equal(options?.actorUserId, viewer.actorUserId);
  assert.equal(options?.canViewAll, false);
  assert.equal(options?.fromAt, "2026-09-30T18:30:00.000Z");
  assert.equal(options?.assignedUserId, "3");
});

test("completed status requires an outcome reason and re-open transition", async () => {
  let saved: EnquiryInput | undefined;
  let current = record();
  const repository = {
    get: async () => current,
    update: async (_id: number, input: EnquiryInput) => {
      saved = input;
      return { ...current, ...input } as EnquiryRecord;
    }
  } as unknown as EnquiryRepository;
  const service = new EnquiryService(repository, relations, {
    actorEmail: "creator@example.com",
    actorUserId: 2,
    canViewAll: false
  });

  await assert.rejects(
    service.updateProperties(7, { statusId: 3 }, "creator@example.com"),
    /outcome reason/i
  );
  await service.updateProperties(
    7,
    { statusId: 3, closedReason: "Customer accepted" },
    "creator@example.com"
  );
  assert.equal(saved?.closedReason, "Customer accepted");

  current = record(3);
  await assert.rejects(
    service.updateProperties(7, { statusId: 2 }, "creator@example.com"),
    /re-open/i
  );
  await service.updateProperties(7, { statusId: 4 }, "creator@example.com");
  assert.equal(saved?.closedReason, null);

  current = record(1);
  await assert.rejects(
    service.updateProperties(7, { statusId: 3, closedReason: "Done" }, "creator@example.com"),
    /open this new call/i
  );
});
