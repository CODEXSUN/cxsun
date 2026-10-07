import assert from "node:assert/strict";
import { test } from "node:test";
import { groupRows, reportDrilldown, type ReportView } from "./reports.model";
import type { EnquiryReportRow } from "../enquiry/index";

const rows: EnquiryReportRow[] = [
  {
    listInId: 2,
    listIn: "Service",
    createdBy: "a@example.com",
    assignedUserId: 3,
    status: "new",
    statusName: "New",
    count: 4
  },
  {
    listInId: 2,
    listIn: "Service",
    createdBy: "a@example.com",
    assignedUserId: 3,
    status: "open",
    statusName: "Open",
    count: 2
  },
  {
    listInId: null,
    listIn: null,
    createdBy: "b@example.com",
    assignedUserId: null,
    status: "won",
    statusName: "Won",
    count: 1
  }
];

test("report groups retain totals and matching status buckets", () => {
  const lists = groupRows(rows, "list-in", []);
  assert.equal(lists.find((group) => group.key === "2")?.total, 6);
  assert.equal(lists.find((group) => group.key === "2")?.counts.get("pending-group"), 2);
  assert.equal(lists.find((group) => group.key === "none")?.counts.get("closed-group"), 1);
  assert.equal(groupRows(rows, "status", []).find((group) => group.key === "new")?.total, 4);
});

test("each report view opens the matching enquiry slice", () => {
  const base = { fromDate: "2026-10-01", toDate: "2026-10-07", assignedUserId: "3" };
  const cases: Array<[ReportView, string, string, string]> = [
    ["list-in", "none", "listInId", "none"],
    ["creator", "a@example.com", "createdBy", "a@example.com"],
    ["assignee", "3", "assignedUserId", "3"],
    ["status", "won", "filter", "won"]
  ];
  for (const [view, key, field, value] of cases) {
    const filters = reportDrilldown(view, key, base, "pending-group");
    assert.equal(filters[field as keyof typeof filters], value);
    assert.equal(filters.fromDate, base.fromDate);
    assert.equal(filters.toDate, base.toDate);
    if (view !== "status") assert.equal(filters.filter, "pending-group");
  }
});
