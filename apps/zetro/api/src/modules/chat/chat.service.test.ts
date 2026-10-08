import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ZetroChatRepository } from "./chat.repository.js";
import { ZetroChatService } from "./chat.service.js";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("sends the owned conversation history and saves a provider reply", async () => {
  let saved: unknown[] = [];
  let requestBody: unknown;
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
    saveReply: async (...args: unknown[]) => {
      saved = args;
      return 5;
    }
  } as unknown as ZetroChatRepository;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: "A reply" } }] }), {
      status: 200
    });
  };
  const service = new ZetroChatService(repository, {
    apiKey: "test-key",
    baseUrl: "https://example.com/v1",
    model: "test-model"
  });
  const result = await service.send("user@example.com", 5, "Next question");
  assert.deepEqual(saved, ["user@example.com", 5, "Next question", "A reply"]);
  assert.deepEqual(
    (requestBody as { messages: Array<{ content: string }> }).messages.map(
      (message) => message.content
    ),
    [
      "You are Zetro, a helpful coworker. Be clear, practical, and honest. Do not claim to have accessed company records or completed actions unless you actually have.",
      "Earlier",
      "Next question"
    ]
  );
  assert.equal(result.conversation.id, 5);
});

test("does not save a message when the provider fails", async () => {
  let saved = false;
  const repository = {
    saveReply: async () => {
      saved = true;
      return 1;
    }
  } as unknown as ZetroChatRepository;
  globalThis.fetch = async () => new Response("unauthorized", { status: 401 });
  const service = new ZetroChatService(repository, {
    apiKey: "test-key",
    baseUrl: "https://example.com/v1",
    model: "test-model"
  });
  await assert.rejects(service.send("user@example.com", null, "Hello"), /rejected/);
  assert.equal(saved, false);
});
