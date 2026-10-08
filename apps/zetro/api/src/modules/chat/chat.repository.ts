import { randomBytes } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { AppError } from "@cxsun/framework/errors";
import type { ZetroConversation, ZetroDatabase, ZetroMessage } from "./chat.types.js";

export class ZetroChatRepository {
  constructor(private readonly database: Kysely<ZetroDatabase>) {}

  async list(ownerEmail: string): Promise<ZetroConversation[]> {
    const rows = await this.database
      .selectFrom("zetro_conversations")
      .select(["id", "uuid", "title", "created_at", "updated_at"])
      .where("owner_email", "=", ownerEmail)
      .orderBy("updated_at", "desc")
      .limit(100)
      .execute();
    return rows.map(conversationRecord);
  }

  async get(id: number, ownerEmail: string): Promise<ZetroConversation> {
    const row = await this.database
      .selectFrom("zetro_conversations")
      .select(["id", "uuid", "title", "created_at", "updated_at"])
      .where("id", "=", id)
      .where("owner_email", "=", ownerEmail)
      .executeTakeFirst();
    if (!row) throw AppError.notFound("Conversation was not found.");
    return conversationRecord(row);
  }

  async messages(conversationId: number): Promise<ZetroMessage[]> {
    const rows = await this.database
      .selectFrom("zetro_messages")
      .select(["id", "uuid", "role", "content", "created_at"])
      .where("conversation_id", "=", conversationId)
      .orderBy("id", "asc")
      .execute();
    return rows.map((row) => ({
      id: row.id,
      uuid: row.uuid,
      role: row.role,
      content: row.content,
      createdAt: timestamp(row.created_at)
    }));
  }

  async saveReply(
    ownerEmail: string,
    conversationId: number | null,
    prompt: string,
    reply: string
  ) {
    return this.database.transaction().execute(async (transaction) => {
      let id = conversationId;
      if (id === null) {
        const created = await transaction
          .insertInto("zetro_conversations")
          .values({
            uuid: randomBytes(4).toString("hex"),
            owner_email: ownerEmail,
            title: prompt.slice(0, 100)
          })
          .executeTakeFirstOrThrow();
        id = Number(created.insertId);
      } else {
        const owner = await transaction
          .selectFrom("zetro_conversations")
          .select("id")
          .where("id", "=", id)
          .where("owner_email", "=", ownerEmail)
          .executeTakeFirst();
        if (!owner) throw AppError.notFound("Conversation was not found.");
      }
      await transaction
        .insertInto("zetro_messages")
        .values([
          {
            uuid: randomBytes(4).toString("hex"),
            conversation_id: id,
            role: "user",
            content: prompt
          },
          {
            uuid: randomBytes(4).toString("hex"),
            conversation_id: id,
            role: "assistant",
            content: reply
          }
        ])
        .execute();
      await transaction
        .updateTable("zetro_conversations")
        .set({ updated_at: sql`CURRENT_TIMESTAMP` })
        .where("id", "=", id)
        .execute();
      return id;
    });
  }

  async delete(id: number, ownerEmail: string) {
    const result = await this.database
      .deleteFrom("zetro_conversations")
      .where("id", "=", id)
      .where("owner_email", "=", ownerEmail)
      .executeTakeFirst();
    if (!Number(result.numDeletedRows)) throw AppError.notFound("Conversation was not found.");
  }
}

function timestamp(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function conversationRecord(row: {
  id: number;
  uuid: string;
  title: string;
  created_at: string | Date;
  updated_at: string | Date;
}): ZetroConversation {
  return {
    id: row.id,
    uuid: row.uuid,
    title: row.title,
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at)
  };
}
