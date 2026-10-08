import type { ZunoDiagnosis } from "./diagnostics.types.js";

export function DiagnosticsEvidenceList({ diagnosis }: { diagnosis: ZunoDiagnosis }) {
  return (
    <section className="space-y-3" aria-label="Evidence">
      <h2 className="text-sm font-semibold">Evidence inspected</h2>
      {diagnosis.evidence.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          The provider did not inspect a source or log tool.
        </p>
      ) : null}
      {diagnosis.evidence.map((item, index) => (
        <details key={`${item.source}-${index}`} className="rounded-md border bg-card p-3">
          <summary className="cursor-pointer text-sm font-medium">{item.source}</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
            {item.content}
          </pre>
        </details>
      ))}
    </section>
  );
}
