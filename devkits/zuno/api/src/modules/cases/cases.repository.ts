import { randomBytes } from "node:crypto";
import type { Kysely, Selectable } from "kysely";
import type {
  ZunoCase,
  ZunoCaseActivity,
  ZunoCaseInput,
  ZunoCaseTable,
  ZunoDatabase,
  CaseStatus
} from "./cases.types.js";

export class CasesRepository {
  constructor(private readonly database: Kysely<ZunoDatabase>) {}

  async list(): Promise<ZunoCase[]> {
    const rows = await this.database
      .selectFrom("zuno_cases")
      .selectAll()
      .orderBy("updated_at", "desc")
      .limit(100)
      .execute();
    return rows.map(toCase);
  }

  async get(uuid: string): Promise<ZunoCase | null> {
    const row = await this.database
      .selectFrom("zuno_cases")
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return row ? toCase(row) : null;
  }

  async activity(uuid: string): Promise<ZunoCaseActivity[]> {
    const rows = await this.database
      .selectFrom("zuno_case_activity")
      .select(["action", "detail", "actor_email", "created_at"])
      .where("case_uuid", "=", uuid)
      .orderBy("id", "asc")
      .execute();
    return rows.map((row) => ({
      action: row.action,
      detail: row.detail,
      actorEmail: row.actor_email,
      createdAt: new Date(row.created_at).toISOString()
    }));
  }

  async create(input: ZunoCaseInput, actorEmail: string): Promise<ZunoCase> {
    const uuid = randomBytes(4).toString("hex");
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("zuno_cases")
        .values({
          uuid,
          kind: input.kind,
          severity: input.severity,
          status: "open",
          tenant_id: input.tenantId,
          title: input.title,
          description: input.description,
          proposal: "",
          sql_plan: "",
          verification: "",
          created_by: actorEmail,
          updated_by: actorEmail
        })
        .execute();
      await recordActivity(transaction, uuid, "created", input.description, actorEmail);
    });
    const created = await this.get(uuid);
    if (!created) throw new Error("The created Zuno case could not be read.");
    return created;
  }

  async transition(input: {
    uuid: string;
    expectedStatus: CaseStatus;
    status: CaseStatus;
    actorEmail: string;
    action: string;
    detail: string;
    proposal?: string;
    sqlPlan?: string;
    verification?: string;
  }): Promise<ZunoCase | null> {
    const changed = await this.database.transaction().execute(async (transaction) => {
      const result = await transaction
        .updateTable("zuno_cases")
        .set({
          status: input.status,
          updated_by: input.actorEmail,
          ...(input.proposal === undefined ? {} : { proposal: input.proposal }),
          ...(input.sqlPlan === undefined ? {} : { sql_plan: input.sqlPlan }),
          ...(input.verification === undefined ? {} : { verification: input.verification })
        })
        .where("uuid", "=", input.uuid)
        .where("status", "=", input.expectedStatus)
        .executeTakeFirst();
      if (!Number(result.numUpdatedRows)) return false;
      await recordActivity(transaction, input.uuid, input.action, input.detail, input.actorEmail);
      return true;
    });
    return changed ? this.get(input.uuid) : null;
  }
}

async function recordActivity(
  database: Kysely<ZunoDatabase>,
  uuid: string,
  action: string,
  detail: string,
  actorEmail: string
) {
  await database
    .insertInto("zuno_case_activity")
    .values({
      uuid: randomBytes(4).toString("hex"),
      case_uuid: uuid,
      action,
      detail,
      actor_email: actorEmail,
      status: "active",
      created_by: actorEmail
    })
    .execute();
}

function toCase(row: Selectable<ZunoCaseTable>): ZunoCase {
  return {
    uuid: row.uuid,
    kind: row.kind,
    severity: row.severity,
    status: row.status,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    proposal: row.proposal,
    verification: row.verification,
    sqlPlan: row.sql_plan ? JSON.parse(row.sql_plan) : null,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}
