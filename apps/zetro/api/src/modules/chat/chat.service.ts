import { z } from "zod";
import { AppError } from "@cxsun/framework/errors";
import { ZetroChatRepository } from "./chat.repository.js";
import type { ZetroProviderConfig } from "./chat.types.js";

const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) }))
});

export class ZetroChatService {
  constructor(
    private readonly repository: ZetroChatRepository,
    private readonly provider: ZetroProviderConfig
  ) {}

  list(ownerEmail: string) {
    return this.repository.list(ownerEmail);
  }

  async get(id: number, ownerEmail: string) {
    const conversation = await this.repository.get(id, ownerEmail);
    return { conversation, messages: await this.repository.messages(id) };
  }

  async send(ownerEmail: string, conversationId: number | null, prompt: string) {
    if (!this.provider.apiKey || !this.provider.model || !this.provider.baseUrl) {
      throw AppError.validation("Zetro AI provider is not configured.");
    }
    const history =
      conversationId === null
        ? []
        : (await this.get(conversationId, ownerEmail)).messages.slice(-20);
    const reply = await this.complete([
      {
        role: "system",
        content:
          "You are Zetro, a helpful coworker. Be clear, practical, and honest. Do not claim to have accessed company records or completed actions unless you actually have."
      },
      ...history.map(({ role, content }) => ({ role, content })),
      { role: "user", content: prompt }
    ]);
    const id = await this.repository.saveReply(ownerEmail, conversationId, prompt, reply);
    return this.get(id, ownerEmail);
  }

  async delete(id: number, ownerEmail: string) {
    await this.repository.delete(id, ownerEmail);
    return { deleted: true as const };
  }

  private async complete(messages: Array<{ role: string; content: string }>) {
    let endpoint: URL;
    try {
      endpoint = new URL(`${this.provider.baseUrl.replace(/\/$/u, "")}/chat/completions`);
    } catch {
      throw AppError.validation("Zetro AI provider URL is invalid.");
    }
    if (
      endpoint.protocol !== "https:" &&
      !(endpoint.protocol === "http:" && ["localhost", "127.0.0.1"].includes(endpoint.hostname))
    ) {
      throw AppError.validation("Zetro AI provider must use HTTPS, except for localhost.");
    }
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.provider.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model: this.provider.model, messages }),
        signal: AbortSignal.timeout(60_000)
      });
    } catch {
      throw AppError.internal("Zetro could not reach its AI provider.");
    }
    if (!response.ok) throw AppError.internal("Zetro AI provider rejected the request.");
    const completion = completionSchema.safeParse(await response.json());
    const reply = completion.success ? completion.data.choices[0]?.message.content?.trim() : "";
    if (!reply) throw AppError.internal("Zetro AI provider returned an empty reply.");
    return reply;
  }
}
