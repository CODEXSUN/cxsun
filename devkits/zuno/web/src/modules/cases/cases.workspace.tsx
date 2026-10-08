import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@cxsun/ui/components/button";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { CasesForm } from "./cases.form.js";
import { useCase, useCases, useTenantTargets, casesQueryKey } from "./cases.hooks.js";
import { CasesList } from "./cases.list.js";
import { CasesShow } from "./cases.show.js";
import {
  approveCase,
  cancelCase,
  completeCase,
  createCase,
  proposeCase,
  planTextCorrection,
  executeTextCorrection,
  reconcileTextCorrection
} from "./cases.services.js";

export function CasesWorkspace() {
  const client = useQueryClient();
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const cases = useCases();
  const targets = useTenantTargets();
  const detail = useCase(selectedUuid);
  const create = useMutation({
    mutationFn: createCase,
    onSuccess: async (record) => {
      setCreating(false);
      setSelectedUuid(record.uuid);
      await client.invalidateQueries({ queryKey: casesQueryKey });
    }
  });
  const transition = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: casesQueryKey });
      await client.invalidateQueries({ queryKey: ["zuno", "cases", selectedUuid] });
    }
  });
  async function run(task: () => Promise<unknown>) {
    await transition.mutateAsync(task);
  }
  return (
    <WorkspacePage
      title="Zuno cases"
      description="Track incidents, recurring checks, corrections, and approved work."
      technicalName="page.zuno.cases"
      actions={
        selectedUuid || creating ? null : (
          <Button type="button" onClick={() => setCreating(true)}>
            New case
          </Button>
        )
      }
    >
      <div className="mx-auto max-w-5xl space-y-4 p-5">
        {creating ? (
          <CasesForm
            targets={targets.data ?? []}
            saving={create.isPending}
            onSave={async (input) => {
              await create.mutateAsync(input);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : null}
        {selectedUuid && detail.data ? (
          <CasesShow
            key={`${selectedUuid}-${detail.data.record.status}-${detail.data.record.proposal}-${JSON.stringify(detail.data.record.sqlPlan)}`}
            detail={detail.data}
            busy={transition.isPending}
            onBack={() => setSelectedUuid(null)}
            onPropose={(value) => run(() => proposeCase(selectedUuid, value))}
            onApprove={() => run(() => approveCase(selectedUuid))}
            onPlanCorrection={(plan) => run(() => planTextCorrection(selectedUuid, plan))}
            onExecuteCorrection={() => run(() => executeTextCorrection(selectedUuid))}
            onReconcileCorrection={() => run(() => reconcileTextCorrection(selectedUuid))}
            onComplete={(value) => run(() => completeCase(selectedUuid, value))}
            onCancel={(value) => run(() => cancelCase(selectedUuid, value))}
          />
        ) : null}
        {selectedUuid && detail.isLoading ? (
          <p role="status" className="text-sm">
            Loading case…
          </p>
        ) : null}
        {selectedUuid && detail.error ? (
          <p role="alert" className="text-sm text-destructive">
            {detail.error.message}
          </p>
        ) : null}
        {!selectedUuid && !creating ? (
          <>
            <p className="text-xs text-muted-foreground">Latest 100 cases</p>
            {cases.error ? (
              <p role="alert" className="text-sm text-destructive">
                {cases.error.message}
              </p>
            ) : null}
            {cases.isLoading ? (
              <p role="status" className="text-sm">
                Loading cases…
              </p>
            ) : (
              <CasesList
                cases={cases.data ?? []}
                onOpen={(record) => setSelectedUuid(record.uuid)}
              />
            )}
          </>
        ) : null}
      </div>
    </WorkspacePage>
  );
}
