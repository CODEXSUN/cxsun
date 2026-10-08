import { useEffect, useState } from "react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormBody,
  WorkspaceFormField,
  WorkspaceFormSurface
} from "@cxsun/ui/workspace/upsert";
import { frappeConnectionSchema } from "./connection.schema";
import type { FrappeConnection, FrappeConnectionInput } from "./connection.types";

export function FrappeConnectionForm({
  connection,
  enabled,
  busy,
  error,
  onSave,
  onVerify
}: {
  connection: FrappeConnection;
  enabled: boolean;
  busy: "save" | "verify" | null;
  error: string | null;
  onSave: (input: FrappeConnectionInput) => void;
  onVerify: (input: FrappeConnectionInput) => void;
}) {
  const [value, setValue] = useState<Omit<FrappeConnectionInput, "enabled">>({
    connectionName: "Frappe",
    baseUrl: "",
    apiKey: "",
    apiSecret: ""
  });
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setValue({
      connectionName: connection.connectionName,
      baseUrl: connection.baseUrl ?? "",
      apiKey: "",
      apiSecret: ""
    });
    setIssues({});
    setSubmitted(false);
  }, [connection]);

  function set<K extends keyof typeof value>(key: K, next: (typeof value)[K]) {
    setValue((current) => ({ ...current, [key]: next }));
    setIssues((current) => ({ ...current, [key]: "" }));
  }

  function submit(action: "save" | "verify") {
    setSubmitted(true);
    const parsed = frappeConnectionSchema.safeParse({ ...value, enabled });
    const nextIssues: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) nextIssues[String(issue.path[0])] = issue.message;
    }
    if (!value.apiKey && (connection.source === "environment" || !connection.appKeyConfigured))
      nextIssues.apiKey = "Frappe app key is required.";
    if (
      !value.apiSecret &&
      (connection.source === "environment" || !connection.appSecretConfigured)
    )
      nextIssues.apiSecret = "Frappe app secret is required.";
    if (connection.baseUrl && value.baseUrl !== connection.baseUrl) {
      if (!value.apiKey) nextIssues.apiKey = "Re-enter the app key for a different Frappe URL.";
      if (!value.apiSecret)
        nextIssues.apiSecret = "Re-enter the app secret for a different Frappe URL.";
    }
    setIssues(nextIssues);
    if (Object.keys(nextIssues).length || !parsed.success) return;
    if (action === "save") onSave(parsed.data);
    else onVerify(parsed.data);
  }

  return (
    <WorkspaceFormSurface>
      <WorkspaceFormBody>
        {error || (submitted && Object.keys(issues).length > 0) ? (
          <WorkspaceFormBanner title="Check the connection details">
            {error ?? "Correct the highlighted fields."}
          </WorkspaceFormBanner>
        ) : null}
        <div className="grid gap-5 md:grid-cols-2">
          <WorkspaceFormField label="Connection name" required>
            <Input
              value={value.connectionName}
              aria-invalid={Boolean(issues.connectionName)}
              onChange={(event) => set("connectionName", event.target.value)}
            />
            {issues.connectionName ? <FieldError>{issues.connectionName}</FieldError> : null}
          </WorkspaceFormField>
          <WorkspaceFormField label="Frappe URL" required>
            <Input
              type="url"
              placeholder="https://frappe.example.com"
              value={value.baseUrl}
              aria-invalid={Boolean(issues.baseUrl)}
              onChange={(event) => set("baseUrl", event.target.value)}
            />
            {issues.baseUrl ? <FieldError>{issues.baseUrl}</FieldError> : null}
          </WorkspaceFormField>
          <WorkspaceFormField label="Frappe app key" required>
            <Input
              type="password"
              autoComplete="off"
              placeholder={
                connection.source === "tenant" && connection.appKeyConfigured
                  ? "Configured — leave blank to keep"
                  : "Enter the Frappe app key"
              }
              value={value.apiKey}
              aria-invalid={Boolean(issues.apiKey)}
              onChange={(event) => set("apiKey", event.target.value)}
            />
            {issues.apiKey ? <FieldError>{issues.apiKey}</FieldError> : null}
          </WorkspaceFormField>
          <WorkspaceFormField label="Frappe app secret" required>
            <Input
              type="password"
              autoComplete="off"
              placeholder={
                connection.source === "tenant" && connection.appSecretConfigured
                  ? "Configured — leave blank to keep"
                  : "Enter the Frappe app secret"
              }
              value={value.apiSecret}
              aria-invalid={Boolean(issues.apiSecret)}
              onChange={(event) => set("apiSecret", event.target.value)}
            />
            {issues.apiSecret ? <FieldError>{issues.apiSecret}</FieldError> : null}
          </WorkspaceFormField>
        </div>
      </WorkspaceFormBody>
      <WorkspaceFormActions>
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => submit("verify")}
        >
          {busy === "verify" ? "Verifying…" : "Verify connection"}
        </Button>
        <Button type="button" disabled={busy !== null} onClick={() => submit("save")}>
          {busy === "save" ? "Saving…" : "Save connection"}
        </Button>
      </WorkspaceFormActions>
    </WorkspaceFormSurface>
  );
}

function FieldError({ children }: { children: string }) {
  return <p className="text-xs text-destructive">{children}</p>;
}
