import { useState, type FormEvent } from "react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { Textarea } from "@cxsun/ui/components/textarea";
import { WorkspaceSelect } from "@cxsun/ui/workspace/select";
import { createCaseSchema } from "./cases.schema.js";
import { caseKinds, caseSeverities, type TenantTarget, type ZunoCaseInput } from "./cases.types.js";

export function CasesForm({
  targets,
  saving,
  onSave,
  onCancel
}: {
  targets: TenantTarget[];
  saving: boolean;
  onSave(input: ZunoCaseInput): Promise<void>;
  onCancel(): void;
}) {
  const [draft, setDraft] = useState<ZunoCaseInput>({
    kind: "incident",
    severity: "medium",
    tenantId: null,
    title: "",
    description: ""
  });
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createCaseSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Review the case fields.");
      return;
    }
    setError("");
    try {
      await onSave(parsed.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The case could not be saved.");
    }
  }
  return (
    <form className="space-y-4 rounded-md border bg-card p-5" onSubmit={submit}>
      <h2 className="text-lg font-semibold">New operations case</h2>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type *">
          <WorkspaceSelect
            ariaLabel="Case type"
            value={draft.kind}
            onValueChange={(kind) =>
              setDraft((value) => ({ ...value, kind: kind as ZunoCaseInput["kind"] }))
            }
            options={caseKinds.map((kind) => ({ value: kind, label: kind.replaceAll("_", " ") }))}
          />
        </Field>
        <Field label="Severity *">
          <WorkspaceSelect
            ariaLabel="Severity"
            value={draft.severity}
            onValueChange={(severity) =>
              setDraft((value) => ({ ...value, severity: severity as ZunoCaseInput["severity"] }))
            }
            options={caseSeverities.map((severity) => ({ value: severity, label: severity }))}
          />
        </Field>
        <Field label={draft.kind === "data_correction" ? "Tenant *" : "Tenant"}>
          <WorkspaceSelect
            ariaLabel="Target tenant"
            value={draft.tenantId === null ? "master" : String(draft.tenantId)}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                tenantId: value === "master" ? null : Number(value)
              }))
            }
            options={[
              { value: "master", label: "Platform / no tenant" },
              ...targets.map((tenant) => ({ value: String(tenant.id), label: tenant.label }))
            ]}
          />
        </Field>
      </div>
      <Field label="Title *">
        <Input
          value={draft.title}
          onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
          maxLength={255}
          placeholder="Short description of the issue"
        />
      </Field>
      <Field label="What happened? *">
        <Textarea
          value={draft.description}
          onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
          rows={6}
          placeholder="Observed behavior, expected behavior, affected records, and timing"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create case"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span className="block">{label}</span>
      {children}
    </label>
  );
}
