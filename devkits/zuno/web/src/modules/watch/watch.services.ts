import type { WatchSnapshot } from "./watch.types.js";

type Envelope<T> = { success: true; data: T } | { success: false; error: { message: string } };

export async function getWatchSnapshot(): Promise<WatchSnapshot> {
  const response = await fetch("/api/zuno/watch", { credentials: "include" });
  const envelope = (await response.json()) as Envelope<WatchSnapshot>;
  if (!response.ok || !envelope.success)
    throw new Error(envelope.success ? "Zuno watch failed." : envelope.error.message);
  return envelope.data;
}
