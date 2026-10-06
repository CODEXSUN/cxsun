import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { GlobalLoader } from "@cxsun/ui/components/global-loader";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspaceShowCard } from "@cxsun/ui/workspace/show";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { AuditorClientCredentials } from "./client.credentials";
import type { AuditorClientGateway } from "./client.services";
import type { AuditorClientRecord } from "./client.types";

export function AuditorClientShowPage({
  record,
  gateway,
  loading,
  error,
  onBack,
  onEdit,
  onRetry
}: {
  record: AuditorClientRecord | undefined;
  gateway: AuditorClientGateway;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onEdit: (record: AuditorClientRecord) => void;
  onRetry: () => void;
}) {
  return (
    <WorkspacePage
      title={record?.name ?? "Client"}
      description={
        record ? `Updated ${formatDateTime(record.updatedAt)}` : "Auditor client details"
      }
      technicalName="page.auditor.clients.show"
      actions={
        <>
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {record ? (
            <Button type="button" onClick={() => onEdit(record)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
        </>
      }
    >
      {error ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
      {loading && !record ? <GlobalLoader className="min-h-32" fullScreen={false} /> : null}
      {record ? (
        <>
          <WorkspaceShowCard title="Client details">
            <dl className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Company" value={record.companyName} />
              <Detail label="Owner" value={record.ownerName} />
              <Detail label="Mobile" value={record.mobile} />
              <Detail label="Email" value={record.email} />
              <Detail label="GSTIN" value={record.gstin} />
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-1">
                  <WorkspaceStatusBadge
                    label={record.status === "active" ? "Active" : "Inactive"}
                    tone={record.status === "active" ? "success" : "neutral"}
                  />
                </dd>
              </div>
            </dl>
          </WorkspaceShowCard>
          <AuditorClientCredentials clientId={record.id} gateway={gateway} />
        </>
      ) : null}
    </WorkspacePage>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all text-sm">{value || "—"}</dd>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
