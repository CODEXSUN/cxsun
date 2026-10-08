import { useState } from "react";
import { Button } from "@cxsun/ui/components/button";
import { Textarea } from "@cxsun/ui/components/textarea";
import { Input } from "@cxsun/ui/components/input";
import type { ZunoCaseDetail, TextCorrectionPlan } from "./cases.types.js";

export function CasesShow({
  detail,
  busy,
  onBack,
  onPropose,
  onApprove,
  onPlanCorrection,
  onExecuteCorrection,
  onReconcileCorrection,
  onComplete,
  onCancel
}: {
  detail: ZunoCaseDetail;
  busy: boolean;
  onBack(): void;
  onPropose(value: string): Promise<void>;
  onApprove(): Promise<void>;
  onPlanCorrection(value: TextCorrectionPlan): Promise<void>;
  onExecuteCorrection(): Promise<void>;
  onReconcileCorrection(): Promise<void>;
  onComplete(value: string): Promise<void>;
  onCancel(value: string): Promise<void>;
}) {
  const { record, activity } = detail;
  const [proposal, setProposal] = useState(record.proposal);
  const [verification, setVerification] = useState(record.verification);
  const [reason, setReason] = useState("");
  const [sqlPlan, setSqlPlan] = useState<TextCorrectionPlan>(
    record.sqlPlan ?? { table: "", column: "", rowId: 0, expectedValue: "", replacementValue: "" }
  );
  const [error, setError] = useState("");
  async function act(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The case could not be updated.");
    }
  }
  return (
    <div className="space-y-5">
      <Button type="button" variant="outline" onClick={onBack}>
        Back to cases
      </Button>
      <section className="rounded-md border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{record.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {record.kind.replaceAll("_", " ")} · {record.severity} ·{" "}
              {record.status.replaceAll("_", " ")} · {record.uuid}
            </p>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm">{record.description}</p>
        {record.tenantId !== null ? (
          <p className="mt-3 text-xs text-muted-foreground">Target tenant ID: {record.tenantId}</p>
        ) : null}
      </section>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {record.status === "open" || record.status === "proposal_ready" ? (
        <section className="space-y-3 rounded-md border bg-card p-5">
          <h3 className="font-semibold">Proposed action</h3>
          <p className="text-sm text-muted-foreground">
            Record the evidence, exact target, backup, expected change, rollback, and verification
            steps.
          </p>
          <Textarea
            value={proposal}
            onChange={(event) => setProposal(event.target.value)}
            rows={9}
            aria-label="Proposed action"
          />
          <Button
            type="button"
            disabled={busy || proposal.trim().length < 20}
            onClick={() => void act(() => onPropose(proposal))}
          >
            Save proposal
          </Button>
          {record.status === "proposal_ready" && record.kind === "data_correction" ? (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium">Exact SQL correction</h4>
              <p className="text-sm text-muted-foreground">
                One existing text field on one tenant row. Current value must match, and a completed
                backup from the last 36 hours is required before execution.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  aria-label="Table"
                  placeholder="Table"
                  value={sqlPlan.table}
                  onChange={(event) => setSqlPlan({ ...sqlPlan, table: event.target.value })}
                />
                <Input
                  aria-label="Column"
                  placeholder="Column"
                  value={sqlPlan.column}
                  onChange={(event) => setSqlPlan({ ...sqlPlan, column: event.target.value })}
                />
                <Input
                  aria-label="Row ID"
                  placeholder="Row ID"
                  type="number"
                  min="1"
                  value={sqlPlan.rowId || ""}
                  onChange={(event) =>
                    setSqlPlan({ ...sqlPlan, rowId: Number(event.target.value) })
                  }
                />
              </div>
              <Textarea
                aria-label="Expected current value"
                placeholder="Exact current value"
                value={sqlPlan.expectedValue}
                onChange={(event) => setSqlPlan({ ...sqlPlan, expectedValue: event.target.value })}
              />
              <Textarea
                aria-label="Replacement value"
                placeholder="Replacement value"
                value={sqlPlan.replacementValue}
                onChange={(event) =>
                  setSqlPlan({ ...sqlPlan, replacementValue: event.target.value })
                }
              />
              <Button
                type="button"
                variant="outline"
                disabled={busy || !sqlPlan.table || !sqlPlan.column || !sqlPlan.rowId}
                onClick={() => void act(() => onPlanCorrection(sqlPlan))}
              >
                Preview and save exact correction
              </Button>
              {record.sqlPlan ? (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    Saved plan for approval: {record.sqlPlan.table}.{record.sqlPlan.column}, row{" "}
                    {record.sqlPlan.rowId}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">
                    Current: {record.sqlPlan.expectedValue}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">
                    Replacement: {record.sqlPlan.replacementValue}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          {record.status === "proposal_ready" ? (
            <Button
              type="button"
              disabled={busy || (record.kind === "data_correction" && !record.sqlPlan)}
              variant="outline"
              onClick={() => {
                if (window.confirm("Approve this exact plan?")) void act(onApprove);
              }}
            >
              Approve plan
            </Button>
          ) : null}
        </section>
      ) : null}
      {record.status === "approved" ||
      record.status === "executing" ||
      record.status === "executed" ||
      record.status === "completed" ? (
        <section className="space-y-3 rounded-md border bg-card p-5">
          <h3 className="font-semibold">Approved plan</h3>
          <p className="whitespace-pre-wrap text-sm">{record.proposal}</p>
          {record.sqlPlan ? (
            <p className="text-sm">
              Approved SQL: UPDATE {record.sqlPlan.table} SET {record.sqlPlan.column} =
              [replacement] WHERE id = {record.sqlPlan.rowId} AND {record.sqlPlan.column} =
              [expected]
            </p>
          ) : null}
          {record.status === "approved" && record.kind === "data_correction" ? (
            <p className="text-sm text-muted-foreground">
              Execution requires a recent completed tenant backup.{" "}
              <a className="underline" href="/sa/tenant-database">
                Review or request tenant backup
              </a>
              .
            </p>
          ) : null}
          {record.status === "approved" && record.kind === "data_correction" ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Execute the approved correction for tenant ${record.tenantId}, row ${record.sqlPlan?.rowId}?`
                  )
                )
                  void act(onExecuteCorrection);
              }}
            >
              Execute approved SQL
            </Button>
          ) : null}
          {record.status === "executing" ? (
            <div className="space-y-2">
              <p role="status" className="text-sm">
                SQL execution is in progress. If it was interrupted, inspect the row and reconcile
                before retrying.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void act(onReconcileCorrection)}
              >
                Reconcile interrupted execution
              </Button>
            </div>
          ) : null}
          {(record.status === "approved" && record.kind !== "data_correction") ||
          record.status === "executed" ? (
            <>
              <Textarea
                value={verification}
                onChange={(event) => setVerification(event.target.value)}
                rows={4}
                aria-label="Verification result"
                placeholder="Record the executed action and the result of verification"
              />
              <Button
                type="button"
                disabled={busy || verification.trim().length < 10}
                onClick={() => void act(() => onComplete(verification))}
              >
                Mark verified and complete
              </Button>
            </>
          ) : null}
          {record.status === "completed" ? (
            <p className="whitespace-pre-wrap text-sm">Verification: {record.verification}</p>
          ) : null}
        </section>
      ) : null}
      {record.status !== "completed" &&
      record.status !== "cancelled" &&
      record.status !== "executing" ? (
        <section className="space-y-2 rounded-md border bg-card p-5">
          <h3 className="font-semibold">Cancel case</h3>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            aria-label="Cancellation reason"
            placeholder="Reason for cancellation"
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy || reason.trim().length < 5}
            onClick={() => void act(() => onCancel(reason))}
          >
            Cancel case
          </Button>
        </section>
      ) : null}
      <section className="rounded-md border bg-card p-5">
        <h3 className="font-semibold">Activity</h3>
        <ol className="mt-3 space-y-3">
          {activity.map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="border-l-2 pl-3 text-sm">
              <p className="font-medium capitalize">
                {entry.action} · {entry.actorEmail}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{entry.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
