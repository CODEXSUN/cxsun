import { AppError } from "@cxsun/framework/errors";
import { DiagnosticsRepository } from "../diagnostics/diagnostics.repository.js";
import { DiagnosticsService } from "../diagnostics/diagnostics.service.js";
import type { ZunoConfig } from "../diagnostics/diagnostics.types.js";
import type { ZunoCaseContext } from "../cases/cases.types.js";
import { WatchRepository } from "../watch/watch.repository.js";
import { WatchService } from "../watch/watch.service.js";
import type { RawWatchSnapshot } from "../watch/watch.types.js";
import { ConversationsRepository } from "./conversations.repository.js";
import type { WorkMode, ZunoThread } from "./conversations.types.js";

export class ConversationsService {
  private readonly repository: ConversationsRepository;
  private readonly diagnostics: DiagnosticsService;

  constructor(
    context: ZunoCaseContext,
    config: ZunoConfig,
    loadWatchSnapshot: () => Promise<RawWatchSnapshot>
  ) {
    this.repository = new ConversationsRepository(context.database, context.actorEmail);
    const watch = new WatchService(new WatchRepository(config), loadWatchSnapshot);
    this.diagnostics = new DiagnosticsService(new DiagnosticsRepository(config), config, () =>
      watch.snapshot()
    );
  }

  list(archived = false) {
    return this.repository.list(archived);
  }
  create(mode: WorkMode) {
    return this.repository.create(mode);
  }

  async get(uuid: string) {
    const thread = await this.requireThread(uuid);
    return { thread, messages: await this.repository.messages(uuid) };
  }

  async rename(uuid: string, title: string) {
    const thread = await this.requireThread(uuid);
    if (thread.status === "archived")
      throw AppError.validation("Restore the conversation before renaming it.");
    await this.repository.rename(uuid, title);
    return this.requireThread(uuid);
  }

  async archive(uuid: string) {
    const thread = await this.requireThread(uuid);
    if (thread.status !== "active")
      throw AppError.validation("Only an idle conversation can be archived.");
    await this.repository.archive(uuid);
    return this.requireThread(uuid);
  }

  async restore(uuid: string) {
    const thread = await this.requireThread(uuid);
    if (thread.status !== "archived")
      throw AppError.validation("This conversation is already active.");
    await this.repository.restore(uuid);
    return this.requireThread(uuid);
  }

  async recover(uuid: string) {
    const thread = await this.requireThread(uuid);
    if (thread.status !== "busy") throw AppError.validation("This conversation is not busy.");
    if (!(await this.repository.recoverStale(uuid, new Date(Date.now() - 10 * 60_000)))) {
      throw AppError.validation("Wait ten minutes before recovering an interrupted run.");
    }
    await this.repository.addMessage(
      uuid,
      "assistant",
      "The previous run was interrupted. You can continue this conversation.",
      [],
      "error"
    );
    return this.get(uuid);
  }

  async send(uuid: string, content: string, mode: WorkMode) {
    const thread = await this.requireThread(uuid);
    if (thread.status !== "active")
      throw AppError.validation("This conversation is busy or archived.");
    const title = thread.title === "New conversation" ? content.trim().slice(0, 80) : thread.title;
    if (!(await this.repository.lock(uuid, mode, title))) {
      throw AppError.validation("This conversation is busy. Wait for the current reply.");
    }
    try {
      const previous = (await this.repository.messages(uuid))
        .filter((message) => message.status === "complete")
        .slice(-12)
        .map(({ role, content: text }) => ({ role, content: text }));
      await this.repository.addMessage(uuid, "user", content);
      try {
        const result = await this.diagnostics.diagnose(content, { mode, history: previous });
        await this.repository.addMessage(uuid, "assistant", result.answer, result.evidence);
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "Zuno could not complete this turn.";
        await this.repository.addMessage(uuid, "assistant", detail, [], "error");
      }
    } finally {
      await this.repository.unlock(uuid);
    }
    return this.get(uuid);
  }

  private async requireThread(uuid: string): Promise<ZunoThread> {
    const thread = await this.repository.get(uuid);
    if (!thread) throw AppError.notFound("Zuno conversation was not found.");
    return thread;
  }
}
