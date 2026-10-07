export type RuntimeConfig = Record<string, string>;

export async function loadRuntimeConfig(
  fetchConfig: typeof fetch = fetch,
  timeoutMs = 60_000
): Promise<RuntimeConfig> {
  const startedAt = Date.now();
  let delayMs = 250;
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchConfig("/api/app/public/runtime-config", {
        signal: AbortSignal.timeout(5_000)
      });
      if (!response.ok) {
        throw new Error(`Runtime configuration failed to load: ${response.status}`);
      }
      const envelope = (await response.json()) as {
        data?: RuntimeConfig;
        success?: boolean;
      };
      if (!envelope.success || !envelope.data) {
        throw new Error("Runtime configuration response is invalid.");
      }
      return envelope.data;
    } catch (error) {
      lastError = error;
    }

    if (Date.now() - startedAt + delayMs >= timeoutMs) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, delayMs));
    delayMs = Math.min(delayMs * 2, 2_000);
  }

  throw lastError;
}
