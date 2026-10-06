import { AppError } from "@cxsun/framework/errors";
import type { Kysely, Selectable } from "kysely";
import { insertEnquiryActivity } from "./enquiry.repository.js";
import type {
  EnquiryActivity,
  EnquiryActivityRow,
  EnquiryDatabase,
  EnquiryEstimate,
  EnquiryEstimateInput,
  EnquiryEstimateRow,
  EnquiryJob,
  EnquiryJobInput,
  EnquiryJobRow
} from "./enquiry.types.js";

export class EnquiryWorkRepository {
  constructor(private readonly database: Kysely<EnquiryDatabase>) {}

  async listJobs(enquiryId: number): Promise<EnquiryJob[]> {
    const rows = await this.database
      .selectFrom("crm_enquiry_jobs")
      .selectAll()
      .where("enquiry_id", "=", enquiryId)
      .orderBy("start_at", "desc")
      .orderBy("id", "desc")
      .execute();
    return rows.map(toJob);
  }

  async startJob(enquiryId: number, employee: string, actor: string) {
    const id = await this.database.transaction().execute(async (transaction) => {
      await this.lockEnquiry(transaction, enquiryId);
      await this.assertNoRunningJob(transaction, enquiryId);
      const result = await transaction
        .insertInto("crm_enquiry_jobs")
        .values({
          enquiry_id: enquiryId,
          employee_user_id: null,
          employee,
          start_at: sqlDate(new Date().toISOString()),
          stop_at: null,
          duration_seconds: 0,
          rate_per_hour: "0.00",
          total_cost: "0.00",
          status: "running",
          created_by: actor
        })
        .executeTakeFirstOrThrow();
      await insertEnquiryActivity(
        transaction,
        enquiryId,
        "job-started",
        `Job started by ${employee}`,
        actor
      );
      return Number(result.insertId);
    });
    return this.getJob(enquiryId, id);
  }

  async stopJob(enquiryId: number, jobId: number, actor: string) {
    await this.database.transaction().execute(async (transaction) => {
      await this.lockEnquiry(transaction, enquiryId);
      const job = await transaction
        .selectFrom("crm_enquiry_jobs")
        .selectAll()
        .where("enquiry_id", "=", enquiryId)
        .where("id", "=", jobId)
        .executeTakeFirst();
      if (!job) throw AppError.notFound("Job was not found on this enquiry.");
      if (job.status !== "running") throw AppError.conflict("This job has already stopped.");
      const stopAt = new Date().toISOString();
      const totals = jobTotals(toIso(job.start_at), stopAt, Number(job.rate_per_hour));
      await transaction
        .updateTable("crm_enquiry_jobs")
        .set({
          stop_at: sqlDate(stopAt),
          status: "completed",
          ...totals
        })
        .where("id", "=", jobId)
        .execute();
      await insertEnquiryActivity(
        transaction,
        enquiryId,
        "job-stopped",
        `Job #${jobId} stopped`,
        actor
      );
    });
    return this.getJob(enquiryId, jobId);
  }

  async saveJob(
    enquiryId: number,
    input: EnquiryJobInput,
    employee: string,
    actor: string,
    jobId?: number
  ) {
    const id = await this.database.transaction().execute(async (transaction) => {
      await this.lockEnquiry(transaction, enquiryId);
      if (jobId) {
        const current = await transaction
          .selectFrom("crm_enquiry_jobs")
          .select("id")
          .where("id", "=", jobId)
          .where("enquiry_id", "=", enquiryId)
          .executeTakeFirst();
        if (!current) throw AppError.notFound("Job was not found on this enquiry.");
      }
      if (input.status === "running") await this.assertNoRunningJob(transaction, enquiryId, jobId);
      const totals = jobTotals(input.startAt, input.stopAt, input.ratePerHour);
      const values = {
        employee_user_id: input.employeeUserId,
        employee,
        start_at: sqlDate(input.startAt),
        stop_at: input.stopAt ? sqlDate(input.stopAt) : null,
        rate_per_hour: input.ratePerHour.toFixed(2),
        status: input.status,
        ...totals
      };
      const savedId =
        jobId ??
        Number(
          (
            await transaction
              .insertInto("crm_enquiry_jobs")
              .values({ ...values, enquiry_id: enquiryId, created_by: actor })
              .executeTakeFirstOrThrow()
          ).insertId
        );
      if (jobId)
        await transaction
          .updateTable("crm_enquiry_jobs")
          .set(values)
          .where("id", "=", jobId)
          .execute();
      await insertEnquiryActivity(
        transaction,
        enquiryId,
        jobId ? "job-updated" : "job-created",
        `Job #${savedId} ${jobId ? "updated" : "created"}`,
        actor
      );
      return savedId;
    });
    return this.getJob(enquiryId, id);
  }

  async getJob(enquiryId: number, id: number) {
    const row = await this.database
      .selectFrom("crm_enquiry_jobs")
      .selectAll()
      .where("enquiry_id", "=", enquiryId)
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) throw AppError.notFound("Job was not found on this enquiry.");
    return toJob(row);
  }

  async listEstimates(enquiryId: number): Promise<EnquiryEstimate[]> {
    const rows = await this.database
      .selectFrom("crm_enquiry_estimates")
      .selectAll()
      .where("enquiry_id", "=", enquiryId)
      .orderBy("estimate_date", "desc")
      .orderBy("id", "desc")
      .execute();
    return rows.map(toEstimate);
  }

  async saveEstimate(
    enquiryId: number,
    input: EnquiryEstimateInput,
    supplierName: string,
    actor: string,
    estimateId?: number
  ) {
    const id = await this.database.transaction().execute(async (transaction) => {
      if (estimateId) {
        const current = await transaction
          .selectFrom("crm_enquiry_estimates")
          .select("id")
          .where("id", "=", estimateId)
          .where("enquiry_id", "=", enquiryId)
          .executeTakeFirst();
        if (!current) throw AppError.notFound("Estimate was not found on this enquiry.");
      }
      const values = {
        estimate_date: input.date,
        item_name: input.itemName.trim(),
        supplier_contact_id: input.supplierContactId,
        supplier_name: supplierName,
        price: input.price.toFixed(2)
      };
      const savedId =
        estimateId ??
        Number(
          (
            await transaction
              .insertInto("crm_enquiry_estimates")
              .values({ ...values, enquiry_id: enquiryId, status: "active", created_by: actor })
              .executeTakeFirstOrThrow()
          ).insertId
        );
      if (estimateId)
        await transaction
          .updateTable("crm_enquiry_estimates")
          .set(values)
          .where("id", "=", estimateId)
          .execute();
      await insertEnquiryActivity(
        transaction,
        enquiryId,
        estimateId ? "estimate-updated" : "estimate-created",
        `Estimate #${savedId} ${estimateId ? "updated" : "created"}: ${values.item_name}`,
        actor
      );
      return savedId;
    });
    const row = await this.database
      .selectFrom("crm_enquiry_estimates")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow();
    return toEstimate(row);
  }

  async listActivity(enquiryId: number): Promise<EnquiryActivity[]> {
    const rows = await this.database
      .selectFrom("crm_enquiry_activity")
      .selectAll()
      .where("enquiry_id", "=", enquiryId)
      .orderBy("created_at", "desc")
      .orderBy("id", "desc")
      .execute();
    return rows.map(toActivity);
  }

  private async lockEnquiry(database: Kysely<EnquiryDatabase>, enquiryId: number) {
    const row = await database
      .selectFrom("crm_enquiries")
      .select("id")
      .where("id", "=", enquiryId)
      .forUpdate()
      .executeTakeFirst();
    if (!row) throw AppError.notFound("Enquiry was not found.");
  }

  private async assertNoRunningJob(
    database: Kysely<EnquiryDatabase>,
    enquiryId: number,
    exceptId?: number
  ) {
    let query = database
      .selectFrom("crm_enquiry_jobs")
      .select("id")
      .where("enquiry_id", "=", enquiryId)
      .where("status", "=", "running");
    if (exceptId) query = query.where("id", "!=", exceptId);
    if (await query.executeTakeFirst())
      throw AppError.conflict("A job is already running for this enquiry.");
  }
}

function jobTotals(startAt: string, stopAt: string | null, ratePerHour: number) {
  const durationSeconds = stopAt
    ? Math.max(0, Math.floor((Date.parse(stopAt) - Date.parse(startAt)) / 1000))
    : 0;
  return {
    duration_seconds: durationSeconds,
    total_cost: ((durationSeconds / 3600) * ratePerHour).toFixed(2)
  };
}

function toJob(row: Selectable<EnquiryJobRow>): EnquiryJob {
  return {
    id: row.id,
    uuid: row.uuid,
    enquiryId: row.enquiry_id,
    employeeUserId: row.employee_user_id,
    employee: row.employee,
    startAt: toIso(row.start_at),
    stopAt: row.stop_at ? toIso(row.stop_at) : null,
    durationSeconds: row.duration_seconds,
    ratePerHour: Number(row.rate_per_hour),
    totalCost: Number(row.total_cost),
    status: row.status,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function toEstimate(row: Selectable<EnquiryEstimateRow>): EnquiryEstimate {
  const estimateDate: unknown = row.estimate_date;
  return {
    id: row.id,
    uuid: row.uuid,
    enquiryId: row.enquiry_id,
    date:
      estimateDate instanceof Date
        ? estimateDate.toISOString().slice(0, 10)
        : String(estimateDate).slice(0, 10),
    itemName: row.item_name,
    supplierContactId: row.supplier_contact_id,
    supplierName: row.supplier_name,
    price: Number(row.price),
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function toActivity(row: Selectable<EnquiryActivityRow>): EnquiryActivity {
  return {
    id: row.id,
    uuid: row.uuid,
    enquiryId: row.enquiry_id,
    action: row.action,
    details: row.details,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at)
  };
}

function sqlDate(value: string) {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(" ", "T");
  return new Date(text.endsWith("Z") ? text : `${text}Z`).toISOString();
}
