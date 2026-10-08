import { useDeferredValue, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Card } from "@cxsun/ui/components/card";
import { WorkspaceFilters } from "@cxsun/ui/workspace/filters";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspacePagination } from "@cxsun/ui/workspace/pagination";
import { buildShowingLabel } from "@cxsun/ui/workspace/utils";
import { FrappeRecordList } from "./overview.list";
import { frappeOverviewKey, useFrappeConnection, useFrappeOverview } from "./overview.hooks";
import { syncFrappeEnquiry, verifyFrappeConnection } from "./overview.services";
import type { FrappeRecord } from "./overview.types";

export function FrappeOverviewWorkspace() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [verifiedUser, setVerifiedUser] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const connection = useFrappeConnection();
  const overview = useFrappeOverview(page, pageSize, deferredSearch);
  const verify = useMutation({
    mutationFn: verifyFrappeConnection,
    onSuccess: (result) => {
      setVerifiedUser(result.user);
      toast.success("Frappe connection verified");
    },
    onError: (error) => toast.error("Connection check failed", { description: error.message })
  });
  const sync = useMutation({
    mutationFn: (record: FrappeRecord) => syncFrappeEnquiry(record.id),
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: frappeOverviewKey });
      toast.success("Enquiry synced", { description: result.remoteName });
    },
    onError: (error) => toast.error("Enquiry sync failed", { description: error.message })
  });
  const configured = connection.data?.configured && connection.data.enabled;
  const counts = overview.data?.counts;
  const totalPages = Math.max(1, Math.ceil((overview.data?.total ?? 0) / pageSize));

  return (
    <WorkspacePage
      title="Frappe"
      description="Connection and outbound sync for local CRM enquiries."
      technicalName="page.frappe.overview"
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void connection.refetch();
            void overview.refetch();
          }}
          disabled={connection.isFetching || overview.isFetching}
        >
          <RefreshCw className="size-4" /> Refresh
        </Button>
      }
    >
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Connection</h2>
          <p className="text-sm text-muted-foreground">
            {connection.isLoading
              ? "Checking configuration…"
              : !connection.data?.configured
                ? "Set up Application connection from the Frappe sidebar."
                : !connection.data.enabled
                  ? "Frappe sync is disabled."
                  : verifiedUser
                    ? `Verified as ${verifiedUser}`
                    : "Configured. Verify before syncing records."}
          </p>
          {connection.data?.baseUrl ? (
            <p className="truncate text-xs text-muted-foreground">{connection.data.baseUrl}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!configured || verify.isPending}
          onClick={() => verify.mutate()}
        >
          {verify.isPending ? "Verifying…" : "Verify connection"}
        </Button>
      </Card>
      {connection.error || overview.error ? (
        <p role="alert" className="text-sm text-destructive">
          {connection.error?.message ?? overview.error?.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <CountCard label="Local enquiries" value={counts?.total} />
        <CountCard label="Posted" value={counts?.synced} />
        <CountCard label="Not posted" value={counts?.pending} />
      </div>
      <WorkspaceFilters
        searchValue={search}
        searchPlaceholder="Search local enquiries"
        onSearchValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />
      <FrappeRecordList
        records={overview.data?.items ?? []}
        loading={overview.isLoading}
        canSync={Boolean(configured)}
        syncingId={sync.isPending ? (sync.variables?.id ?? null) : null}
        onSync={(record) => sync.mutate(record)}
      />
      <WorkspacePagination
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[10, 20, 50, 100]}
        showingLabel={buildShowingLabel(page, pageSize, overview.data?.total ?? 0)}
        singularLabel="enquiry"
        totalCount={overview.data?.total ?? 0}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />
    </WorkspacePage>
  );
}

function CountCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value ?? "—"}</p>
    </Card>
  );
}
