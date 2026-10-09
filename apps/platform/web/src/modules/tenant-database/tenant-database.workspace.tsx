import { useState } from "react";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { TenantDatabaseForm } from "./tenant-database.form";
import {
  useTenantDatabaseDetailsQuery,
  useTenantDatabaseMutations,
  useTenantDatabaseQuery
} from "./tenant-database.hooks";
import { TenantDatabaseList } from "./tenant-database.list";
import { TenantDatabaseShowPage } from "./tenant-database.show";
import type { TenantDatabaseStatus } from "./tenant-database.types";

type TenantDatabaseView = { mode: "list" } | { mode: "show"; record: TenantDatabaseStatus };

export function TenantDatabaseWorkspace({
  onOpenBackups
}: {
  onOpenBackups: (tenantId: number) => void;
}) {
  const [view, setView] = useState<TenantDatabaseView>({ mode: "list" });
  const query = useTenantDatabaseQuery();
  const detailsQuery = useTenantDatabaseDetailsQuery(
    view.mode === "show" ? view.record.tenantId : null
  );
  const mutations = useTenantDatabaseMutations();
  const busy = mutations.migrate.isPending;
  const selectedRecord =
    view.mode === "show"
      ? (detailsQuery.data ??
        (query.data ?? []).find((record) => record.tenantId === view.record.tenantId) ??
        view.record)
      : null;

  if (view.mode === "show" && selectedRecord) {
    return (
      <TenantDatabaseShowPage
        busy={busy}
        details={detailsQuery.data}
        loading={query.isFetching || detailsQuery.isFetching}
        record={selectedRecord}
        onBack={() => setView({ mode: "list" })}
        onBackup={() => onOpenBackups(selectedRecord.tenantId)}
        onMigrate={() => mutations.migrate.mutate(selectedRecord.tenantId)}
        onRefresh={() => {
          void query.refetch();
          void detailsQuery.refetch();
        }}
      />
    );
  }

  return (
    <WorkspacePage
      title="Tenant Databases"
      description="Watch tenant database live status, migration sync, backup requests, and restore readiness."
      technicalName="page.database.tenants"
      actions={
        <TenantDatabaseForm loading={query.isLoading} onRefresh={() => void query.refetch()} />
      }
    >
      <TenantDatabaseList
        loading={query.isFetching}
        records={query.data ?? []}
        onView={(record) => setView({ mode: "show", record })}
        onBackups={(record) => onOpenBackups(record.tenantId)}
      />
    </WorkspacePage>
  );
}
