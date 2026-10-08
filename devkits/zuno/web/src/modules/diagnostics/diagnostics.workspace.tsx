import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { WorkspacePage } from "@cxsun/ui/workspace";
import { DiagnosticsForm } from "./diagnostics.form.js";
import { useZunoStatus } from "./diagnostics.hooks.js";
import { DiagnosticsEvidenceList } from "./diagnostics.list.js";
import { diagnoseWithZuno } from "./diagnostics.services.js";
import type { ZunoDiagnosis } from "./diagnostics.types.js";

export function ZunoWorkspace() {
  const status = useZunoStatus();
  const [diagnosis, setDiagnosis] = useState<ZunoDiagnosis | null>(null);
  const investigate = useMutation({ mutationFn: diagnoseWithZuno, onSuccess: setDiagnosis });
  return (
    <WorkspacePage
      title="Zuno"
      description="Internal code and production troubleshooting"
      technicalName="page.zuno.diagnostics"
    >
      <div className="mx-auto max-w-4xl space-y-5 p-5">
        <section className="rounded-md border bg-card p-5">
          <h1 className="text-lg font-semibold">Investigate an issue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zuno can inspect configured source files and recent Platform API logs. Its tools are
            read only.
          </p>
          {status.data ? (
            <p className="my-4 text-xs text-muted-foreground">
              Source: {status.data.sourceReady ? "ready" : "unavailable"} · Platform log:{" "}
              {status.data.logReady ? "ready" : "unavailable"} · Model:{" "}
              {status.data.modelReady ? "ready" : "unavailable"}
            </p>
          ) : null}
          {status.error ? (
            <p role="alert" className="my-3 text-sm text-destructive">
              {status.error.message}
            </p>
          ) : null}
          <DiagnosticsForm
            busy={investigate.isPending}
            onSubmit={async (question) => {
              setDiagnosis(null);
              await investigate.mutateAsync(question).catch(() => undefined);
            }}
          />
          {investigate.error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {investigate.error.message}
            </p>
          ) : null}
        </section>
        {diagnosis ? (
          <section className="space-y-5 rounded-md border bg-card p-5">
            <h2 className="text-lg font-semibold">Diagnosis</h2>
            <p className="whitespace-pre-wrap text-sm leading-6">{diagnosis.answer}</p>
            <DiagnosticsEvidenceList diagnosis={diagnosis} />
          </section>
        ) : null}
      </div>
    </WorkspacePage>
  );
}
