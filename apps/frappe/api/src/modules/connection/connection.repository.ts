import type { Kysely } from "kysely";
import type { FrappeDatabase } from "./connection.types.js";
import { sql } from "kysely";
import type { EnquiryListOptions } from "@cxsun/crm-api/enquiry-sync";

export class FrappeConnectionRepository {
  constructor(private readonly database: Kysely<FrappeDatabase>) {}

  get(enquiryId: number) {
    return this.database
      .selectFrom("frappe_enquiry_sync")
      .select(["remote_name", "synced_at"])
      .where("enquiry_id", "=", enquiryId)
      .executeTakeFirst();
  }

  async save(enquiryId: number, remoteName: string) {
    await this.database
      .insertInto("frappe_enquiry_sync")
      .values({ enquiry_id: enquiryId, remote_name: remoteName })
      .onDuplicateKeyUpdate({ remote_name: remoteName, synced_at: new Date().toISOString() })
      .execute();
  }

  async overview(
    viewer: Pick<EnquiryListOptions, "actorEmail" | "actorUserId" | "canViewAll">,
    ids: number[]
  ) {
    let countsQuery = this.database
      .selectFrom("crm_enquiries as enquiry")
      .leftJoin("frappe_enquiry_sync as sync", "sync.enquiry_id", "enquiry.id")
      .select([
        sql<number>`COUNT(*)`.as("total"),
        sql<number>`SUM(CASE WHEN sync.enquiry_id IS NULL THEN 0 ELSE 1 END)`.as("synced")
      ]);
    if (!viewer.canViewAll) {
      countsQuery = countsQuery.where((expression) =>
        expression.or([
          expression("enquiry.created_by", "=", viewer.actorEmail),
          ...(viewer.actorUserId
            ? [expression("enquiry.assigned_user_id", "=", viewer.actorUserId)]
            : [])
        ])
      );
    }
    const [counts, syncRows] = await Promise.all([
      countsQuery.executeTakeFirstOrThrow(),
      ids.length
        ? this.database
            .selectFrom("frappe_enquiry_sync")
            .select(["enquiry_id", "remote_name", "synced_at"])
            .where("enquiry_id", "in", ids)
            .execute()
        : Promise.resolve([])
    ]);
    return {
      total: Number(counts.total),
      synced: Number(counts.synced ?? 0),
      byId: new Map(syncRows.map((row) => [row.enquiry_id, row]))
    };
  }
}
