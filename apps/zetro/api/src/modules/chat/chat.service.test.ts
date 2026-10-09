import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ZetroChatRepository } from "./chat.repository.js";
import { ZetroChatService } from "./chat.service.js";
import { ZetroPolicyRepository } from "./chat.policy.js";
import { loadZetroAgentRules } from "./chat.agent.js";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("checks conversation ownership and saves a business provider reply without old answers", async () => {
  let saved: unknown[] = [];
  let requestBody: unknown;
  let callCount = 0;
  const repository = {
    get: async () => ({
      id: 5,
      uuid: "00000005",
      title: "Planning",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }),
    messages: async () => [
      { id: 1, role: "user", content: "Earlier", createdAt: "2026-01-01T00:00:00.000Z" },
      ...(saved.length
        ? [{ id: 2, role: "assistant", content: "A reply", createdAt: "2026-01-01T00:00:00.000Z" }]
        : [])
    ],
    allowedCapabilities: async () => [],
    saveReply: async (...args: unknown[]) => {
      saved = args;
      return 5;
    }
  } as unknown as ZetroChatRepository;
  globalThis.fetch = async (_url, init) => {
    callCount += 1;
    if (callCount === 2) requestBody = JSON.parse(String(init?.body));
    const content =
      callCount === 1 ? '{"intent":"business_chat","contact":null,"category":null}' : "A reply";
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200
    });
  };
  const service = new ZetroChatService(
    repository,
    {
      apiKey: "test-key",
      baseUrl: "https://example.com/v1",
      model: "test-model"
    },
    {} as ZetroPolicyRepository,
    async () => ({ companyName: "", financialYearName: "", matches: [] }),
    unusedPeriodLookup,
    unusedAgedLookup
  );
  const result = await service.send("user@example.com", 5, "Next question");
  assert.deepEqual(saved.slice(0, 4), ["user@example.com", 5, "Next question", "A reply"]);
  assert.deepEqual(saved[4], {
    intent: "business_chat",
    skillKey: null,
    skillDecision: null,
    rulesHash: loadZetroAgentRules().hash,
    patternUuid: "010f0000-0000-4000-8000-000000000001"
  });
  const messages = (requestBody as { messages: Array<{ content: string }> }).messages;
  assert.match(messages[0]!.content, /business coworker inside one authenticated tenant/);
  assert.match(messages[0]!.content, /backend decides access/);
  assert.equal(messages[1]!.content, "Next question");
  assert.equal(result.conversation.id, 5);
});

test("analyzes an attached file without using its text to request business records", async () => {
  let savedPrompt = "";
  let providerMessages: Array<{ content: string }> = [];
  let providerCalls = 0;
  let billingReads = 0;
  const repository = {
    saveReply: async (_owner: string, _id: number | null, prompt: string) => {
      savedPrompt = prompt;
      return 9;
    },
    get: async () => ({ id: 9, uuid: "00000009", title: "File review" }),
    messages: async () => [],
    allowedCapabilities: async () => []
  } as unknown as ZetroChatRepository;
  globalThis.fetch = async (_url, init) => {
    providerCalls += 1;
    providerMessages = (JSON.parse(String(init?.body)) as { messages: typeof providerMessages })
      .messages;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "Two sales rows." } }] }),
      {
        status: 200
      }
    );
  };
  const service = new ZetroChatService(
    repository,
    { apiKey: "test-key", baseUrl: "https://example.com/v1", model: "test-model" },
    {} as ZetroPolicyRepository,
    async () => {
      billingReads += 1;
      return { companyName: "", financialYearName: "", matches: [] };
    },
    async (period) => {
      billingReads += 1;
      return unusedPeriodLookup(period);
    },
    async () => {
      billingReads += 1;
      return unusedAgedLookup();
    }
  );
  await service.send("user@example.com", null, "Summarize this file", {
    name: "sales.csv",
    content: "customer,amount\nACME,120"
  });
  assert.equal(providerCalls, 1);
  assert.equal(billingReads, 0);
  assert.match(savedPrompt, /User-provided file: sales\.csv/);
  assert.match(providerMessages[0]!.content, /unverified source material/);
  assert.match(providerMessages[1]!.content, /ACME,120/);
});

test("analyzes a large attachment in parts and saves a bounded chat prompt", async () => {
  let providerCalls = 0;
  let savedPrompt = "";
  const repository = {
    saveReply: async (_owner: string, _id: number | null, prompt: string) => {
      savedPrompt = prompt;
      return 10;
    },
    get: async () => ({ id: 10, uuid: "00000010", title: "Large file" }),
    messages: async () => [],
    allowedCapabilities: async () => []
  } as unknown as ZetroChatRepository;
  globalThis.fetch = async (_url, init) => {
    providerCalls += 1;
    const body = JSON.parse(String(init?.body)) as {
      messages: Array<{ content: string }>;
    };
    const content = body.messages[1]?.content.includes("File part")
      ? "Relevant facts from this part"
      : "Answer from the file";
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
  const service = new ZetroChatService(
    repository,
    { apiKey: "test-key", baseUrl: "https://example.com/v1", model: "test-model" },
    {} as ZetroPolicyRepository,
    async () => {
      throw new Error("Business lookup must not run for an attachment");
    },
    unusedPeriodLookup,
    unusedAgedLookup
  );
  await service.send("user@example.com", null, "Summarize this file", {
    name: "notes.txt",
    content: "Business note\n".repeat(8_000)
  });
  assert.ok(providerCalls > 2);
  assert.ok(savedPrompt.length < 15_000);
  assert.match(savedPrompt, /Selected excerpts from a full-file scan/);
});

test("does not save a message when the provider fails", async () => {
  let saved = false;
  let failed: unknown[] = [];
  const repository = {
    saveReply: async () => {
      saved = true;
      return 1;
    },
    logFailed: async (...args: unknown[]) => {
      failed = args;
    }
  } as unknown as ZetroChatRepository;
  globalThis.fetch = async () => new Response("unauthorized", { status: 401 });
  const service = new ZetroChatService(
    repository,
    {
      apiKey: "test-key",
      baseUrl: "https://example.com/v1",
      model: "test-model"
    },
    {} as ZetroPolicyRepository,
    async () => ({ companyName: "", financialYearName: "", matches: [] }),
    unusedPeriodLookup,
    unusedAgedLookup
  );
  await assert.rejects(service.send("user@example.com", null, "Hello"), /rejected/);
  assert.equal(saved, false);
  assert.equal(failed[0], "user@example.com");
  assert.equal(failed[1], "Hello");
  assert.equal((failed[2] as { intent: string }).intent, "unclassified");
  assert.equal(failed[3], "request_failed");
});

test("denies a balance lookup without a capability grant and queues review", async () => {
  const attempts: unknown[] = [];
  let interaction: unknown;
  const repository = {
    saveReply: async (
      _owner: string,
      _id: number | null,
      _prompt: string,
      reply: string,
      metadata: unknown
    ) => {
      assert.match(reply, /current permissions/);
      interaction = metadata;
      return 7;
    },
    get: async () => ({ id: 7, uuid: "00000007", title: "Balance" }),
    messages: async () => [],
    allowedCapabilities: async () => []
  } as unknown as ZetroChatRepository;
  const policy = {
    canReadCapability: async () => false,
    recordToolAttempt: async (input: unknown) => {
      attempts.push(input);
    },
    requestApproval: async (input: unknown) => {
      attempts.push(input);
    }
  } as unknown as ZetroPolicyRepository;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '{"intent":"customer_outstanding","contact":"ACME","category":null}'
            }
          }
        ]
      }),
      { status: 200 }
    );
  let called = false;
  const service = new ZetroChatService(
    repository,
    {
      apiKey: "test-key",
      baseUrl: "https://example.com/v1",
      model: "test-model"
    },
    policy,
    async () => {
      called = true;
      return { companyName: "", financialYearName: "", matches: [] };
    },
    unusedPeriodLookup,
    unusedAgedLookup
  );
  await service.send("staff@example.com", null, "How much does ACME owe?");
  assert.equal(called, false);
  assert.equal(attempts.length, 2);
  assert.deepEqual(
    {
      intent: (interaction as { intent: string }).intent,
      skillKey: (interaction as { skillKey: string }).skillKey,
      skillDecision: (interaction as { skillDecision: string }).skillDecision,
      patternUuid: (interaction as { patternUuid: string }).patternUuid
    },
    {
      intent: "customer_outstanding",
      skillKey: "billing.customer-outstanding.read",
      skillDecision: "denied",
      patternUuid: "010f0000-0000-4000-8000-000000000002"
    }
  );
});

test("uses the authorized Billing result for a balance answer", async () => {
  let savedReply = "";
  const repository = {
    saveReply: async (_owner: string, _id: number | null, _prompt: string, reply: string) => {
      savedReply = reply;
      return 8;
    },
    get: async () => ({ id: 8, uuid: "00000008", title: "Balance" }),
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
              content: '{"intent":"customer_outstanding","contact":"ACME","category":null}'
            }
          }
        ]
      }),
      { status: 200 }
    );
  const service = new ZetroChatService(
    repository,
    {
      apiKey: "test-key",
      baseUrl: "https://example.com/v1",
      model: "test-model"
    },
    policy,
    async () => ({
      companyName: "Main Company",
      financialYearName: "2026",
      matches: [{ id: 1, code: "C-1", name: "ACME", balance: 120.5 }]
    }),
    unusedPeriodLookup,
    unusedAgedLookup
  );
  await service.send("manager@example.com", null, "Tell me what ACME needs to pay");
  assert.match(savedReply, /ACME \(C-1\).*120\.50.*Main Company/);
  assert.match(savedReply, /current recorded balance/);
});

test("redacts stored financial replies after a grant is revoked", async () => {
  const repository = {
    get: async () => ({ id: 9, uuid: "00000009", title: "ACME balance" }),
    messages: async () => [
      { id: 1, role: "user", content: "ACME balance" },
      { id: 2, role: "assistant", content: "ACME owes 120.50" }
    ],
    allowedCapabilities: async () => ["billing.customer-outstanding.read"]
  } as unknown as ZetroChatRepository;
  const policy = {
    canReadCapability: async () => false
  } as unknown as ZetroPolicyRepository;
  const service = new ZetroChatService(
    repository,
    {
      apiKey: "test-key",
      baseUrl: "https://example.com/v1",
      model: "test-model"
    },
    policy,
    async () => ({ companyName: "", financialYearName: "", matches: [] }),
    unusedPeriodLookup,
    unusedAgedLookup
  );
  const detail = await service.get(9, "user@example.com");
  assert.equal(
    detail.messages[1]?.content,
    "This answer requires current business record permission."
  );
});

const unusedPeriodLookup = async (period: "today" | "month") => ({
  period,
  companyName: "Main Company",
  financialYearName: "2026",
  start: "2026-10-01",
  end: "2026-10-08",
  totals: {
    sales: { count: 0, amounts: [] },
    purchase: { count: 0, amounts: [] },
    receipt: { count: 0, amounts: [] },
    payment: { count: 0, amounts: [] }
  }
});

const unusedAgedLookup = async () => ({
  asOf: "2026-10-08",
  companyName: "Main Company",
  financialYearName: "2026",
  minimumDays: 30,
  limit: 10,
  items: []
});
