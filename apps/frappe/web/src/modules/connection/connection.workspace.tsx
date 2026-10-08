import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@cxsun/ui/components/card";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspaceStatusBadge, WorkspaceSwitchCard } from "@cxsun/ui/workspace/status";
import { FrappeConnectionForm } from "./connection.form";
import { frappeConnectionKey, useFrappeConnectionSettings } from "./connection.hooks";
import { saveFrappeConnection, verifyFrappeConnection } from "./connection.services";

export function FrappeConnectionWorkspace() {
  const client = useQueryClient();
  const connection = useFrappeConnectionSettings();
  const [verifiedUser, setVerifiedUser] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (connection.data) setEnabled(connection.data.enabled);
  }, [connection.data]);
  const save = useMutation({
    mutationFn: saveFrappeConnection,
    onSuccess: async () => {
      setVerifiedUser(null);
      await client.invalidateQueries({ queryKey: frappeConnectionKey });
      toast.success("Frappe connection saved");
    },
    onError: (error) => toast.error("Unable to save connection", { description: error.message })
  });
  const verify = useMutation({
    mutationFn: verifyFrappeConnection,
    onSuccess: async (result) => {
      setVerifiedUser(result.user);
      if (result.saved) await client.invalidateQueries({ queryKey: frappeConnectionKey });
      toast.success("Frappe connection verified", { description: result.user });
    },
    onError: (error) => toast.error("Connection check failed", { description: error.message })
  });
  const data = connection.data;
  return (
    <WorkspacePage
      title="Frappe connection"
      description="Configure the Frappe destination for manual CRM enquiry sync."
      technicalName="page.frappe.connection"
    >
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <KeyRound className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Connection state</h2>
            <p className="text-sm text-muted-foreground">
              {verifiedUser
                ? `Form values verified as ${verifiedUser}. Save to use edited values.`
                : !data?.configured
                  ? "Configure the Frappe connection below."
                  : !data.enabled
                    ? "Connection disabled"
                    : data.verificationStatus === "verified"
                      ? "Connection verified"
                      : data.verificationStatus === "failed"
                        ? "Last connection check failed"
                        : data.source === "tenant"
                          ? "Connection saved. Verify before syncing."
                          : "Using server defaults. Save to manage this connection here."}
            </p>
          </div>
          {data ? (
            <div className="flex flex-wrap gap-2">
              <WorkspaceStatusBadge
                label={data.configured ? "Configured" : "Not configured"}
                tone={data.configured ? "success" : "warning"}
              />
              <WorkspaceStatusBadge
                label={
                  data.verificationStatus === "verified"
                    ? "Verified"
                    : data.verificationStatus === "failed"
                      ? "Verification failed"
                      : "Not verified"
                }
                tone={data.verificationStatus === "verified" ? "success" : "warning"}
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-end">
          <WorkspaceSwitchCard
            className="min-w-64"
            label="Connection enabled"
            description={
              enabled !== data?.enabled
                ? "Save connection to apply this change."
                : "Allows manual sync to Frappe."
            }
            checked={enabled}
            disabled={!data || save.isPending || verify.isPending}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              setVerifiedUser(null);
            }}
          />
        </div>
      </Card>
      {connection.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading connection…</p>
      ) : null}
      {connection.error ? (
        <p role="alert" className="text-sm text-destructive">
          {connection.error.message}
        </p>
      ) : null}
      {data ? (
        <FrappeConnectionForm
          connection={data}
          enabled={enabled}
          busy={save.isPending ? "save" : verify.isPending ? "verify" : null}
          error={save.error?.message ?? verify.error?.message ?? null}
          onSave={(input) => save.mutate(input)}
          onVerify={(input) => verify.mutate(input)}
        />
      ) : null}
    </WorkspacePage>
  );
}
