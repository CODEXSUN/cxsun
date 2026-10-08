import { randomBytes } from "node:crypto";
import type { Kysely, Selectable } from "kysely";
import type { ZunoDatabase } from "../cases/cases.types.js";
import type {
  WorkMode,
  ZunoMessage,
  ZunoMessageTable,
  ZunoThread,
  ZunoThreadTable
} from "./conversations.types.js";

export class ConversationsRepository {
  constructor(
    private readonly database: Kysely<ZunoDatabase>,
    private readonly actorEmail: string
  ) {}

  async list(archived = false): Promise<ZunoThread[]> {
    const rows = await this.database
      .selectFrom("zuno_threads")
      .selectAll()
      .where("created_by", "=", this.actorEmail)
      .where("status", archived ? "=" : "!=", "archived")
      .orderBy("updated_at", "desc")
      .limit(500)
      .execute();
    return rows.map(toThread);
  }

  async get(uuid: string): Promise<ZunoThread | null> {
    const row = await this.database
      .selectFrom("zuno_threads")
      .selectAll()
      .where("uuid", "=", uuid)
      .where("created_by", "=", this.actorEmail)
      .executeTakeFirst();
    return row ? toThread(row) : null;
  }

  async messages(uuid: string): Promise<ZunoMessage[]> {
    const rows = await this.database
      .selectFrom("zuno_messages")
      .selectAll()
      .where("thread_uuid", "=", uuid)
      .orderBy("id", "desc")
      .limit(200)
      .execute();
    return rows.reverse().map(toMessage);
  }

  async create(mode: WorkMode): Promise<ZunoThread> {
    const uuid = randomBytes(4).toString("hex");
    await this.database
      .insertInto("zuno_threads")
      .values({
        uuid,
        title: "New conversation",
        mode,
        status: "active",
        created_by: this.actorEmail,
        updated_by: this.actorEmail
      })
      .execute();
    return (await this.get(uuid))!;
  }

  async rename(uuid: string, title: string): Promise<ZunoThread | null> {
    await this.database
      .updateTable("zuno_threads")
      .set({ title, updated_by: this.actorEmail })
      .where("uuid", "=", uuid)
      .where("created_by", "=", this.actorEmail)
      .where("status", "!=", "archived")
      .execute();
    return this.get(uuid);
  }

  async archive(uuid: string): Promise<ZunoThread | null> {
    await this.database
      .updateTable("zuno_threads")
      .set({ status: "archived", updated_by: this.actorEmail })
      .where("uuid", "=", uuid)
      .where("created_by", "=", this.actorEmail)
      .where("status", "=", "active")
      .execute();
    return this.get(uuid);
  }

  async restore(uuid: string): Promise<ZunoThread | null> {
    await this.database
      .updateTable("zuno_threads")
      .set({ status: "active", updated_by: this.actorEmail })
      .where("uuid", "=", uuid)
      .where("created_by", "=", this.actorEmail)
      .where("status", "=", "archived")
      .execute();
    return this.get(uuid);
  }

  async lock(uuid: string, mode: WorkMode, title: string): Promise<boolean> {
    const result = await this.database
      .updateTable("zuno_threads")
      .set({ status: "busy", mode, title, updated_by: this.actorEmail })
      .where("uuid", "=", uuid)
      .where("created_by", "=", this.actorEmail)
      .where("status", "=", "active")
      .executeTakeFirst();
    return Number(result.numUpdatedRows) === 1;
  }

  async unlock(uuid: string) {
    await this.database
      .updateTable("zuno_threads")
      .set({ status: "active", updated_by: this.actorEmail })
      .where("uuid", "=", uuid)
      .where("created_by", "=", this.actorEmail)
      .where("status", "=", "busy")
      .execute();
  }

  async recoverStale(uuid: string, cutoff: Date) {
    const result = await this.database
      .updateTable("zuno_threads")
      .set({ status: "active", updated_by: this.actorEmail })
      .where("uuid", "=", uuid)
      .where("created_by", "=", this.actorEmail)
      .where("status", "=", "busy")
      .where("updated_at", "<", cutoff)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) === 1;
  }

  async addMessage(
    uuid: string,
    role: "user" | "assistant",
    content: string,
    evidence: ZunoMessage["evidence"] = [],
    status: "complete" | "error" = "complete"
  ) {
    const messageUuid = randomBytes(4).toString("hex");
    await this.database
      .insertInto("zuno_messages")
      .values({
        uuid: messageUuid,
        thread_uuid: uuid,
        role,
        status,
        content,
        evidence_json: JSON.stringify(evidence),
        created_by: this.actorEmail
      })
      .execute();
    return messageUuid;
  }
}

function toThread(row: Selectable<ZunoThreadTable>): ZunoThread {
  return {
    uuid: row.uuid,
    title: row.title,
    mode: row.mode,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function toMessage(row: Selectable<ZunoMessageTable>): ZunoMessage {
  return {
    uuid: row.uuid,
    role: row.role,
    status: row.status,
    content: row.content,
    evidence: JSON.parse(row.evidence_json),
    createdAt: new Date(row.created_at).toISOString()
  };
}
