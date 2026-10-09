import { randomBytes } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { AppError } from "@cxsun/framework/errors";
import type { ZetroDatabase } from "./chat.types.js";
import type { ZetroRecordCapability } from "./chat.patterns.js";

export const CUSTOMER_OUTSTANDING_CAPABILITY = "billing.customer-outstanding.read";

export class ZetroPolicyRepository {
  constructor(private readonly database: Kysely<ZetroDatabase>) {}

  async canReadCapability(actorEmail: string, capabilityKey: ZetroRecordCapability) {
    const result = await sql<{ allowed: number }>`SELECT 1 AS allowed
      FROM app_users user
      JOIN app_user_roles user_role ON user_role.user_id = user.id AND user_role.status = 'active'
      JOIN app_roles role ON role.id = user_role.role_id AND role.status = 'active'
      JOIN zetro_capability_grants grant_record ON grant_record.role_key = role.\`key\`
        AND grant_record.capability_key = ${capabilityKey}
        AND grant_record.status = 'active'
      JOIN app_role_permissions role_permission ON role_permission.role_id = role.id
        AND role_permission.status = 'active'
      JOIN app_permissions permission ON permission.id = role_permission.permission_id
        AND permission.\`key\` = 'billing.application.records.view' AND permission.status = 'active'
      WHERE user.email = ${actorEmail} AND user.status = 'active' LIMIT 1`.execute(this.database);
    return Boolean(result.rows[0]);
  }

  async recordToolAttempt(input: {
    actorEmail: string;
    conversationId: number | null;
    capabilityKey: ZetroRecordCapability;
    decision: "allowed" | "denied" | "failed";
    request: unknown;
    result?: unknown;
  }) {
    await this.database
      .insertInto("zetro_tool_events")
      .values({
        uuid: randomBytes(4).toString("hex"),
        actor_email: input.actorEmail,
        conversation_id: input.conversationId,
        capability_key: input.capabilityKey,
        decision: input.decision,
        request_json: JSON.stringify(input.request),
        result_json: input.result === undefined ? null : JSON.stringify(input.result)
      })
      .execute();
  }

  async requestApproval(
    actorEmail: string,
    conversationId: number | null,
    capabilityKey: ZetroRecordCapability,
    request: unknown
  ) {
    await this.database
      .insertInto("zetro_approval_requests")
      .values({
        uuid: randomBytes(4).toString("hex"),
        actor_email: actorEmail,
        conversation_id: conversationId,
        capability_key: capabilityKey,
        status: "pending",
        request_json: JSON.stringify(request),
        decided_by: null,
        decision_note: null,
        decided_at: null
      })
      .execute();
  }

  async grants() {
    return this.database
      .selectFrom("zetro_capability_grants")
      .select([
        "id",
        "uuid",
        "role_key",
        "capability_key",
        "status",
        "approved_by",
        "reason",
        "created_at",
        "updated_at"
      ])
      .orderBy("id", "desc")
      .execute();
  }

  async roles() {
    const result = await sql<{ role_key: string; label: string }>`SELECT \`key\` role_key, label
      FROM app_roles WHERE status='active' ORDER BY label`.execute(this.database);
    return result.rows;
  }

  async grantEvents() {
    return this.database
      .selectFrom("zetro_policy_events")
      .selectAll()
      .orderBy("id", "desc")
      .limit(100)
      .execute();
  }

  async setGrant(
    roleKey: string,
    capabilityKey: ZetroRecordCapability,
    status: "active" | "revoked",
    approvedBy: string,
    reason: string
  ) {
    const role = await sql<{
      id: number;
    }>`SELECT id FROM app_roles WHERE \`key\`=${roleKey} AND status='active' LIMIT 1`.execute(
      this.database
    );
    if (!role.rows[0]) throw AppError.notFound("Tenant role was not found.");
    await this.database.transaction().execute(async (transaction) => {
      await sql`INSERT INTO zetro_capability_grants
        (uuid, role_key, capability_key, status, approved_by, reason)
        VALUES (${randomBytes(4).toString("hex")}, ${roleKey}, ${capabilityKey}, ${status}, ${approvedBy}, ${reason})
        ON DUPLICATE KEY UPDATE status=${status}, approved_by=${approvedBy}, reason=${reason}, updated_at=CURRENT_TIMESTAMP`.execute(
        transaction
      );
      await transaction
        .insertInto("zetro_policy_events")
        .values({
          uuid: randomBytes(4).toString("hex"),
          role_key: roleKey,
          capability_key: capabilityKey,
          status,
          decided_by: approvedBy,
          reason
        })
        .execute();
    });
  }

  async review(conversationId: number) {
    const conversation = await this.database
      .selectFrom("zetro_conversations")
      .select(["id", "uuid", "owner_email", "title", "deleted_at", "created_at"])
      .where("id", "=", conversationId)
      .executeTakeFirst();
    if (!conversation) throw AppError.notFound("Conversation was not found.");
    const [messages, notes, events, interactions] = await Promise.all([
      this.database
        .selectFrom("zetro_messages")
        .select(["id", "role", "content", "created_at"])
        .where("conversation_id", "=", conversationId)
        .orderBy("id")
        .execute(),
      this.database
        .selectFrom("zetro_review_notes")
        .select(["id", "reviewer_email", "note", "created_at"])
        .where("conversation_id", "=", conversationId)
        .orderBy("id")
        .execute(),
      this.database
        .selectFrom("zetro_tool_events")
        .select([
          "id",
          "actor_email",
          "capability_key",
          "decision",
          "request_json",
          "result_json",
          "created_at"
        ])
        .where("conversation_id", "=", conversationId)
        .orderBy("id")
        .execute(),
      this.database
        .selectFrom("zetro_interaction_logs")
        .selectAll()
        .where("conversation_id", "=", conversationId)
        .orderBy("id")
        .execute()
    ]);
    return { conversation, messages, notes, events, interactions };
  }

  async interactions(ownerEmail?: string) {
    let query = this.database.selectFrom("zetro_interaction_logs").selectAll();
    if (ownerEmail) query = query.where("actor_email", "=", ownerEmail);
    return query.orderBy("id", "desc").limit(100).execute();
  }

  async listReview(ownerEmail?: string) {
    let query = this.database
      .selectFrom("zetro_conversations")
      .select(["id", "uuid", "owner_email", "title", "deleted_at", "created_at", "updated_at"]);
    if (ownerEmail) query = query.where("owner_email", "=", ownerEmail);
    return query.orderBy("updated_at", "desc").limit(100).execute();
  }

  async addNote(conversationId: number, reviewerEmail: string, note: string) {
    const exists = await this.database
      .selectFrom("zetro_conversations")
      .select("id")
      .where("id", "=", conversationId)
      .executeTakeFirst();
    if (!exists) throw AppError.notFound("Conversation was not found.");
    await this.database
      .insertInto("zetro_review_notes")
      .values({
        uuid: randomBytes(4).toString("hex"),
        conversation_id: conversationId,
        reviewer_email: reviewerEmail,
        note
      })
      .execute();
  }

  async approvals() {
    return this.database
      .selectFrom("zetro_approval_requests")
      .selectAll()
      .orderBy("id", "desc")
      .limit(100)
      .execute();
  }

  async decideApproval(
    id: number,
    decidedBy: string,
    status: "approved" | "rejected",
    note: string
  ) {
    const result = await this.database
      .updateTable("zetro_approval_requests")
      .set({ status, decided_by: decidedBy, decision_note: note, decided_at: new Date() })
      .where("id", "=", id)
      .where("status", "=", "pending")
      .executeTakeFirst();
    if (!Number(result.numUpdatedRows))
      throw AppError.notFound("Pending approval request was not found.");
  }
}
