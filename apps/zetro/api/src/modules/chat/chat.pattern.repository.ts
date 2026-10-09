import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { AppError } from "@cxsun/framework/errors";
import type { ZetroDatabase } from "./chat.types.js";

export type ZetroPatternDraft = {
  serialNo: number;
  questionPattern: string;
  queryPattern: string;
  limitation: string;
  extra: string;
};

export class ZetroPatternRepository {
  constructor(private readonly database: Kysely<ZetroDatabase>) {}

  list() {
    return this.database
      .selectFrom("zetro_query_patterns")
      .select([
        "uuid",
        "serial_no",
        "intent_key",
        "question_pattern",
        "query_pattern",
        "limitation",
        "extra",
        "status",
        "created_at",
        "updated_at"
      ])
      .orderBy("serial_no")
      .execute();
  }

  async createDraft(input: ZetroPatternDraft, actorEmail: string) {
    const exists = await this.database
      .selectFrom("zetro_query_patterns")
      .select("id")
      .where("serial_no", "=", input.serialNo)
      .executeTakeFirst();
    if (exists) throw AppError.conflict("This Zetro serial number is already used.");
    const uuid = randomUUID();
    await this.database
      .insertInto("zetro_query_patterns")
      .values({
        uuid,
        serial_no: input.serialNo,
        intent_key: null,
        question_pattern: input.questionPattern,
        query_pattern: input.queryPattern,
        limitation: input.limitation,
        extra: input.extra,
        status: "draft",
        created_by: actorEmail,
        updated_by: actorEmail
      })
      .execute();
    return { uuid, status: "draft" as const };
  }
}
