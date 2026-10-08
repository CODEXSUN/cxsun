import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Card } from "@cxsun/ui/components/card";
import { Input } from "@cxsun/ui/components/input";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspacePagination } from "@cxsun/ui/workspace/pagination";
import { buildShowingLabel } from "@cxsun/ui/workspace/utils";
import {
  localEnquiriesKey,
  remoteEnquiriesKey,
  useConnectionState,
  useLocalEnquiries,
  useRemoteEnquiries
} from "./enquiry-sync.hooks";
import { LocalEnquiryList, RemoteEnquiryList } from "./enquiry-sync.list";
import { postEnquiry, pullEnquiry } from "./enquiry-sync.services";

type Direction = "pull" | "post";
type BatchInput = { direction: "pull"; ids: string[] } | { direction: "post"; ids: number[] };
type BatchResult = {
  completed: number;
  total: number;
  failures: { id: string; message: string }[];
};

export function FrappeEnquirySyncWorkspace() {
  const client = useQueryClient();
  const [direction, setDirection] = useState<Direction>("pull");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRemote, setSelectedRemote] = useState<Set<string>>(new Set());
  const [selectedLocal, setSelectedLocal] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<BatchResult | null>(null);
  const deferredSearch = useDeferredValue(search);
  const connection = useConnectionState();
  const remote = useRemoteEnquiries(direction === "pull");
  const local = useLocalEnquiries(direction === "post", page, pageSize, deferredSearch);
  const connected = Boolean(connection.data?.configured && connection.data.enabled);
  const remoteRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (remote.data ?? []).filter(
      (record) =>
        !term ||
        [record.name, record.title, record.mobile ?? "", record.status ?? ""].some((value) =>
          value.toLowerCase().includes(term)
        )
    );
  }, [remote.data, search]);

  const batch = useMutation({
    mutationFn: async (input: BatchInput): Promise<BatchResult> => {
      const failures: BatchResult["failures"] = [];
      let completed = 0;
      setProgress(0);
      for (const id of input.ids) {
        try {
          if (input.direction === "pull") await pullEnquiry(String(id));
          else await postEnquiry(Number(id));
          completed += 1;
        } catch (error) {
          failures.push({
            id: String(id),
            message: error instanceof Error ? error.message : "Sync failed."
          });
        }
        setProgress((value) => value + 1);
      }
      return { completed, total: input.ids.length, failures };
    },
    onSuccess: async (result) => {
      setLastResult(result);
      setSelectedRemote(new Set());
      setSelectedLocal(new Set());
      await Promise.all([
        client.invalidateQueries({ queryKey: remoteEnquiriesKey }),
        client.invalidateQueries({ queryKey: localEnquiriesKey })
      ]);
      if (result.failures.length)
        toast.warning(`${result.completed} of ${result.total} enquiries synced`);
      else toast.success(`${result.completed} enquiries synced`);
    },
    onError: (error) => toast.error("Enquiry sync failed", { description: error.message })
  });

  function selectDirection(value: Direction) {
    setDirection(value);
    setSearch("");
    setPage(1);
    setSelectedRemote(new Set());
    setSelectedLocal(new Set());
    setLastResult(null);
  }

  function runSelection() {
    if (!connected || batch.isPending) return;
    if (direction === "pull" && selectedRemote.size)
      batch.mutate({ direction, ids: [...selectedRemote] });
    if (direction === "post" && selectedLocal.size)
      batch.mutate({ direction, ids: [...selectedLocal] });
  }

  const selectedCount = direction === "pull" ? selectedRemote.size : selectedLocal.size;
  const totalPages = Math.max(1, Math.ceil((local.data?.total ?? 0) / pageSize));

  return (
    <WorkspacePage
      title="Enquiry sync"
      description="Manually move selected enquiries between Frappe and local CRM."
      technicalName="page.frappe.enquiry-sync"
      actions={
        <Button
          variant="outline"
          disabled={
            batch.isPending || (direction === "pull" ? remote.isFetching : local.isFetching)
          }
          onClick={() => void (direction === "pull" ? remote.refetch() : local.refetch())}
        >
          <RefreshCw className="size-4" /> Refresh
        </Button>
      }
    >
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Manual sync</h2>
            <p className="text-xs text-muted-foreground">
              {connection.data?.baseUrl || "Configure a Frappe connection to sync enquiries."}
            </p>
          </div>
          <span
            className={`text-xs font-medium ${connected ? "text-emerald-700" : "text-amber-700"}`}
          >
            {connected ? "Connection enabled" : "Connection unavailable"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={direction === "pull" ? "default" : "outline"}
            disabled={batch.isPending}
            onClick={() => selectDirection("pull")}
          >
            From Frappe
          </Button>
          <Button
            type="button"
            variant={direction === "post" ? "default" : "outline"}
            disabled={batch.isPending}
            onClick={() => selectDirection("post")}
          >
            To Frappe
          </Button>
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedCount || batch.isPending}
            onClick={() =>
              direction === "pull" ? setSelectedRemote(new Set()) : setSelectedLocal(new Set())
            }
          >
            Clear
          </Button>
          <Button
            type="button"
            disabled={!connected || !selectedCount || batch.isPending}
            onClick={runSelection}
          >
            {batch.isPending
              ? `Syncing ${progress}/${batch.variables?.ids.length ?? 0}…`
              : direction === "pull"
                ? "Pull selected"
                : "Post selected"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {direction === "pull"
            ? "Pull creates or updates local CRM records. A local edit after the last sync blocks the pull for that record."
            : "Post creates or updates Frappe records from the selected local CRM enquiries."}
        </p>
      </Card>
      {connection.error || remote.error || local.error ? (
        <p role="alert" className="text-sm text-destructive">
          {connection.error?.message ?? remote.error?.message ?? local.error?.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {direction === "pull" ? (
          <>
            <CountCard label="Frappe enquiries" value={remote.data?.length} />
            <CountCard
              label="Linked locally"
              value={remote.data?.filter((record) => record.localEnquiryId).length}
            />
            <CountCard
              label="Not imported"
              value={remote.data?.filter((record) => !record.localEnquiryId).length}
            />
          </>
        ) : (
          <>
            <CountCard label="Local enquiries" value={local.data?.counts.total} />
            <CountCard label="Linked to Frappe" value={local.data?.counts.synced} />
            <CountCard label="Not posted" value={local.data?.counts.pending} />
          </>
        )}
      </div>
      {lastResult ? (
        <Card className="space-y-2 p-4" role="status">
          <p className="text-sm font-medium">
            {lastResult.completed} of {lastResult.total} enquiries synced
          </p>
          {lastResult.failures.map((failure) => (
            <p key={failure.id} className="text-xs text-destructive">
              {failure.id}: {failure.message}
            </p>
          ))}
        </Card>
      ) : null}
      <div className="max-w-xl">
        <Input
          aria-label={direction === "pull" ? "Search Frappe enquiries" : "Search local enquiries"}
          placeholder={direction === "pull" ? "Search Frappe enquiries" : "Search local enquiries"}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
            setSelectedRemote(new Set());
            setSelectedLocal(new Set());
          }}
        />
      </div>
      {direction === "pull" ? (
        <RemoteEnquiryList
          records={remoteRecords}
          loading={remote.isLoading}
          selected={selectedRemote}
          busy={batch.isPending}
          enabled={connected}
          onSelect={(name, checked) =>
            setSelectedRemote((current) => {
              const next = new Set(current);
              if (checked) next.add(name);
              else next.delete(name);
              return next;
            })
          }
          onSelectAll={(checked) =>
            setSelectedRemote(
              checked ? new Set(remoteRecords.map((record) => record.name)) : new Set()
            )
          }
          onPull={(name) => batch.mutate({ direction: "pull", ids: [name] })}
        />
      ) : (
        <>
          <LocalEnquiryList
            records={local.data?.items ?? []}
            loading={local.isLoading}
            selected={selectedLocal}
            busy={batch.isPending}
            enabled={connected}
            onSelect={(id, checked) =>
              setSelectedLocal((current) => {
                const next = new Set(current);
                if (checked) next.add(id);
                else next.delete(id);
                return next;
              })
            }
            onSelectAll={(checked) =>
              setSelectedLocal(
                checked ? new Set((local.data?.items ?? []).map((record) => record.id)) : new Set()
              )
            }
            onPost={(id) => batch.mutate({ direction: "post", ids: [id] })}
          />
          <WorkspacePagination
            page={page}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[10, 20, 50, 100]}
            showingLabel={buildShowingLabel(page, pageSize, local.data?.total ?? 0)}
            singularLabel="enquiry"
            totalCount={local.data?.total ?? 0}
            totalPages={totalPages}
            onNextPage={() => {
              setPage((value) => Math.min(totalPages, value + 1));
              setSelectedLocal(new Set());
            }}
            onPageChange={(value) => {
              setPage(value);
              setSelectedLocal(new Set());
            }}
            onPreviousPage={() => {
              setPage((value) => Math.max(1, value - 1));
              setSelectedLocal(new Set());
            }}
            onRowsPerPageChange={(value) => {
              setPageSize(value);
              setPage(1);
              setSelectedLocal(new Set());
            }}
          />
        </>
      )}
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
