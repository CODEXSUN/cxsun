import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ZetroChatService } from "./chat.service.js";
import type { ZetroChatRepository } from "./chat.repository.js";
import type { ZetroPolicyRepository } from "./chat.policy.js";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const periodResult = {
  companyName: "Main Company",
  financialYearName: "2026-27",
  start: "2026-10-01",
  end: "2026-10-08",
  totals: {
    sales: { count: 2, amounts: [{ currency: "INR", amount: 1200 }] },
    purchase: { count: 1, amounts: [{ currency: "INR", amount: 400 }] },
    receipt: { count: 3, amounts: [{ currency: "INR", amount: 300 }] },
    payment: { count: 0, amounts: [] }
  }
};

for (const scenario of [
  {
    prompt: "what is todays report",
    intent: "today_report",
    category: null,
    expected: /Today's report.*Sales: 2 documents.*Receipts: 3 documents/s,
    pattern: "0004"
  },
  {
    prompt: "how much did we collect this month",
    intent: "month_report",
    category: "receipt",
    expected: /This month's report.*Receipts: 3 documents/s,
    pattern: "0005"
  }
] as const) {
  test(`answers ${scenario.prompt} from Billing totals`, async () => {
    let savedReply = "";
    let savedPattern = "";
    let usedPeriod = "";
    const repository = {
      saveReply: async (
        _owner: string,
        _conversation: number | null,
        _prompt: string,
        reply: string,
        interaction: { patternUuid: string }
      ) => {
        savedReply = reply;
        savedPattern = interaction.patternUuid;
        return 1;
      },
      get: async () => ({ id: 1, uuid: "00000001", title: "Report" }),
      messages: async () => [],
      allowedCapabilities: async () => []
    } as unknown as ZetroChatRepository;
    const policy = {
      canReadCapability: async () => true,
      recordToolAttempt: async () => undefined
    } as unknown as ZetroPolicyRepository;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  intent: scenario.intent,
                  contact: null,
                  category: scenario.category
                })
              }
            }
          ]
        }),
        { status: 200 }
      );
    const service = new ZetroChatService(
      repository,
      { apiKey: "test", baseUrl: "https://example.com/v1", model: "test" },
      policy,
      async () => ({ companyName: "", financialYearName: "", matches: [] }),
      async (period) => {
        usedPeriod = period;
        return { ...periodResult, period };
      },
      async () => ({
        asOf: "2026-10-08",
        companyName: "",
        financialYearName: "",
        minimumDays: 30,
        limit: 10,
        items: []
      })
    );
    await service.send("manager@example.com", null, scenario.prompt);
    assert.equal(usedPeriod, scenario.intent === "today_report" ? "today" : "month");
    assert.match(savedReply, scenario.expected);
    if (scenario.category === "receipt") assert.doesNotMatch(savedReply, /Sales: 2 documents/);
    assert.match(savedPattern, new RegExp(`${scenario.pattern}$`));
  });
}

test("shows the oldest unpaid sales only after an active grant", async () => {
  let allowed = false;
  let lookupCount = 0;
  let reply = "";
  const approvals: unknown[] = [];
  const repository = {
    saveReply: async (
      _owner: string,
      _conversation: number | null,
      _prompt: string,
      value: string
    ) => {
      reply = value;
      return 1;
    },
    get: async () => ({ id: 1, uuid: "00000001", title: "Aged sales" }),
    messages: async () => [],
    allowedCapabilities: async () => []
  } as unknown as ZetroChatRepository;
  const policy = {
    canReadCapability: async () => allowed,
    recordToolAttempt: async () => undefined,
    requestApproval: async (...args: unknown[]) => {
      approvals.push(args);
    }
  } as unknown as ZetroPolicyRepository;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '{"intent":"long_outstanding_sales","contact":null,"category":null}'
            }
          }
        ]
      }),
      { status: 200 }
    );
  const service = new ZetroChatService(
    repository,
    { apiKey: "test", baseUrl: "https://example.com/v1", model: "test" },
    policy,
    async () => ({ companyName: "", financialYearName: "", matches: [] }),
    async (period) => ({ ...periodResult, period }),
    async () => {
      lookupCount += 1;
      return {
        asOf: "2026-10-08",
        companyName: "Main Company",
        financialYearName: "2026-27",
        minimumDays: 30,
        limit: 10,
        items: [
          {
            invoiceNumber: "S-1",
            documentKind: "sale",
            customerName: "ACME",
            currency: "INR",
            issuedOn: "2026-08-01",
            daysOld: 68,
            amountDue: 250
          }
        ]
      };
    }
  );
  await service.send("staff@example.com", null, "which sales invoices are unpaid longest?");
  assert.equal(lookupCount, 0);
  assert.equal(approvals.length, 1);
  allowed = true;
  await service.send("manager@example.com", null, "oldest outstanding sales");
  assert.equal(lookupCount, 1);
  assert.match(reply, /S-1.*ACME.*INR 250\.00.*68 days old/s);
});
