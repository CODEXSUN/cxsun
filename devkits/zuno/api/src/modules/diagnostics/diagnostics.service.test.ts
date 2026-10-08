import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DiagnosticsRepository } from "./diagnostics.repository.js";
import { DiagnosticsService } from "./diagnostics.service.js";

test("Zuno asks the provider to inspect the Platform log before diagnosing", async () => {
  const sandbox = await mkdtemp(join(tmpdir(), "cxsun-zuno-agent-"));
  const originalFetch = globalThis.fetch;
  try {
    const platformLogPath = join(sandbox, "platform.log");
    await writeFile(platformLogPath, "tenant request failed with 403\n");
    const config = {
      sourceRoot: "",
      platformLogPath,
      providerBaseUrl: "https://model.example.test/v1",
      providerModel: "diagnostic-model",
      providerApiKey: "test-key"
    };
    const requests: Array<{
      messages: Array<{ role: string; content: string }>;
      tool_choice: string;
    }> = [];
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as (typeof requests)[number];
      requests.push(body);
      const message =
        requests.length === 1
          ? {
              content: null,
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: { name: "tail_platform_log", arguments: "{}" }
                }
              ]
            }
          : {
              content: "The Platform log shows a 403. Check the authorization decision.",
              tool_calls: []
            };
      return new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });
    };
    const result = await new DiagnosticsService(new DiagnosticsRepository(config), config).diagnose(
      "Why are tenant requests failing?"
    );
    assert.match(result.answer, /403/u);
    assert.equal(result.evidence[0]?.source, "Platform API log (recent)");
    assert.match(result.evidence[0]?.content ?? "", /tenant request failed/u);
    assert.equal(requests[0]?.tool_choice, "required");
    assert.equal(requests[1]?.messages.at(-1)?.role, "tool");
  } finally {
    globalThis.fetch = originalFetch;
    await rm(sandbox, { recursive: true, force: true });
  }
});
