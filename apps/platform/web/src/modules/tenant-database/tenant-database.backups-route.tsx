import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "@cxsun/ui/components/button";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { useTenantDatabaseQuery } from "./tenant-database.hooks";
import { TenantDatabaseBackupsWorkspace } from "./tenant-database.backups-workspace";

export function TenantDatabaseBackupsRoute({ onBack }: { onBack: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tenantId = Number((location.search as Record<string, unknown>).tenant);
  const query = useTenantDatabaseQuery();
  const record = query.data?.find((tenant) => tenant.tenantId === tenantId);

  if (record) {
    return <TenantDatabaseBackupsWorkspace key={record.tenantId} record={record} onBack={onBack} />;
  }

  return (
    <WorkspacePage
      title="Tenant Backup & Restore"
      description="Select a tenant database to manage its backup files."
      technicalName="page.database.tenant.backups"
      actions={
        <Button variant="outline" onClick={onBack}>
          Tenant Databases
        </Button>
      }
    >
      <section className="rounded-md border bg-card p-4 text-sm">
        {query.isLoading
          ? "Loading tenant database…"
          : query.error
            ? query.error.message
            : Number.isInteger(tenantId) && tenantId > 0
              ? "This tenant database is unavailable. Select another tenant below."
              : "Select a tenant to open its backup and restore page."}
        {query.data?.length ? (
          <div className="mt-4 divide-y">
            {query.data.map((tenant) => (
              <div
                key={tenant.tenantId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{tenant.tenantName}</p>
                  <p className="text-muted-foreground">{tenant.databaseName}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    void navigate({
                      params: { _splat: "tenant-backups" },
                      search: { tenant: tenant.tenantId },
                      to: "/sa/$"
                    })
                  }
                >
                  Backup & Restore
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </WorkspacePage>
  );
}
