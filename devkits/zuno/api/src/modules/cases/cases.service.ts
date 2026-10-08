import { AppError } from "@cxsun/framework/errors";
import { CasesRepository } from "./cases.repository.js";
import type {
  ZunoCase,
  ZunoCaseContext,
  ZunoCaseInput,
  CaseStatus,
  TextCorrectionPlan
} from "./cases.types.js";

export class CasesService {
  private readonly repository: CasesRepository;
  constructor(private readonly context: ZunoCaseContext) {
    this.repository = new CasesRepository(context.database);
  }

  list() {
    return this.repository.list();
  }
  targets() {
    return this.context.listTenantTargets();
  }

  async get(uuid: string) {
    const record = await this.repository.get(uuid);
    if (!record) throw AppError.notFound("Zuno case was not found.");
    return { record, activity: await this.repository.activity(uuid) };
  }

  async create(input: ZunoCaseInput) {
    if (input.tenantId !== null && !(await this.context.tenantExists(input.tenantId))) {
      throw AppError.validation("Target tenant was not found.");
    }
    if (input.kind === "data_correction" && input.tenantId === null) {
      throw AppError.validation("Data corrections require an explicit tenant target.");
    }
    return this.repository.create(input, this.context.actorEmail);
  }

  async propose(uuid: string, proposal: string) {
    const record = await this.requireCase(uuid);
    if (!canPropose(record.status))
      throw AppError.validation("This case cannot accept a proposal.");
    return this.transition(uuid, record.status, "proposal_ready", "proposal", proposal, {
      proposal
    });
  }

  async approve(uuid: string) {
    const record = await this.requireCase(uuid);
    if (record.status !== "proposal_ready")
      throw AppError.validation("Only a proposed case can be approved.");
    if (record.kind === "data_correction" && !record.sqlPlan) {
      throw AppError.validation("Save and preview the exact SQL correction before approval.");
    }
    return this.transition(uuid, "proposal_ready", "approved", "approved", record.proposal);
  }

  async planTextCorrection(uuid: string, plan: TextCorrectionPlan) {
    const record = await this.requireCase(uuid);
    if (
      record.kind !== "data_correction" ||
      record.tenantId === null ||
      record.status !== "proposal_ready"
    ) {
      throw AppError.validation("This case is not ready for a tenant data correction plan.");
    }
    if (plan.expectedValue === plan.replacementValue)
      throw AppError.validation("The replacement must differ from the expected value.");
    const preview = await this.context.previewTextCorrection(record.tenantId, plan);
    if (preview.currentValue !== plan.expectedValue)
      throw AppError.validation("The current row value does not match the expected value.");
    const updated = await this.repository.transition({
      uuid,
      expectedStatus: "proposal_ready",
      status: "proposal_ready",
      action: "sql_plan",
      detail: preview.sql,
      actorEmail: this.context.actorEmail,
      sqlPlan: JSON.stringify(plan)
    });
    if (!updated)
      throw AppError.validation("The case changed while you were reviewing it. Refresh and retry.");
    return { record: updated, preview };
  }

  async executeTextCorrection(uuid: string) {
    const record = await this.requireCase(uuid);
    if (
      record.kind !== "data_correction" ||
      record.tenantId === null ||
      !record.sqlPlan ||
      record.status !== "approved"
    ) {
      throw AppError.validation("Only an approved tenant data correction can execute SQL.");
    }
    const locked = await this.repository.transition({
      uuid,
      expectedStatus: "approved",
      status: "executing",
      action: "execution_started",
      detail: "Approved SQL execution started.",
      actorEmail: this.context.actorEmail
    });
    if (!locked)
      throw AppError.validation("The case changed while you were reviewing it. Refresh and retry.");
    let result: { backupRunId: number; sql: string };
    try {
      result = await this.context.executeTextCorrection(record.tenantId, record.sqlPlan);
    } catch (error) {
      await this.repository.transition({
        uuid,
        expectedStatus: "executing",
        status: "approved",
        action: "execution_failed",
        detail: error instanceof Error ? error.message : "SQL execution failed.",
        actorEmail: this.context.actorEmail
      });
      throw error;
    }
    const executed = await this.repository.transition({
      uuid,
      expectedStatus: "executing",
      status: "executed",
      action: "sql_executed",
      detail: `Backup run ${result.backupRunId}. ${result.sql}`,
      actorEmail: this.context.actorEmail
    });
    if (!executed)
      throw new Error(
        "SQL executed, but the Zuno case audit could not be finalized. Investigate before retrying."
      );
    return executed;
  }

  async reconcileTextCorrection(uuid: string) {
    const record = await this.requireCase(uuid);
    if (
      record.kind !== "data_correction" ||
      record.status !== "executing" ||
      !record.sqlPlan ||
      record.tenantId === null
    ) {
      throw AppError.validation("Only an interrupted SQL correction can be reconciled.");
    }
    const preview = await this.context.previewTextCorrection(record.tenantId, record.sqlPlan);
    const status =
      preview.currentValue === record.sqlPlan.replacementValue
        ? "executed"
        : preview.currentValue === record.sqlPlan.expectedValue
          ? "approved"
          : null;
    if (!status)
      throw AppError.validation(
        "The row has a third value. Investigate it before changing this case."
      );
    const updated = await this.repository.transition({
      uuid,
      expectedStatus: "executing",
      status,
      action: "execution_reconciled",
      detail:
        status === "executed"
          ? "Replacement value is present after interrupted execution."
          : "Original value is still present; execution can be retried.",
      actorEmail: this.context.actorEmail
    });
    if (!updated)
      throw AppError.validation("The case changed while reconciling. Refresh and retry.");
    return updated;
  }

  async complete(uuid: string, verification: string) {
    const record = await this.requireCase(uuid);
    const expected = record.kind === "data_correction" ? "executed" : "approved";
    if (record.status !== expected)
      throw AppError.validation("Execute the approved correction before completing this case.");
    return this.transition(uuid, expected, "completed", "completed", verification, {
      verification
    });
  }

  async cancel(uuid: string, reason: string) {
    const record = await this.requireCase(uuid);
    if (
      record.status === "completed" ||
      record.status === "cancelled" ||
      record.status === "executing"
    ) {
      throw AppError.validation("This case is already closed.");
    }
    return this.transition(uuid, record.status, "cancelled", "cancelled", reason);
  }

  private async requireCase(uuid: string): Promise<ZunoCase> {
    const record = await this.repository.get(uuid);
    if (!record) throw AppError.notFound("Zuno case was not found.");
    return record;
  }

  private async transition(
    uuid: string,
    expectedStatus: CaseStatus,
    status: CaseStatus,
    action: string,
    detail: string,
    fields: { proposal?: string; verification?: string } = {}
  ) {
    const record = await this.repository.transition({
      uuid,
      expectedStatus,
      status,
      action,
      detail,
      actorEmail: this.context.actorEmail,
      ...fields
    });
    if (!record)
      throw AppError.validation("The case changed while you were reviewing it. Refresh and retry.");
    return record;
  }
}

function canPropose(status: CaseStatus) {
  return status === "open" || status === "proposal_ready";
}
