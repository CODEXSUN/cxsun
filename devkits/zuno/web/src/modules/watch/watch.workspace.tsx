import { Button } from "@cxsun/ui/components/button";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { useWatchSnapshot } from "./watch.hooks.js";
import { WatchTargetsList } from "./watch.list.js";

export function WatchWorkspace() {
  const watch = useWatchSnapshot();
  const snapshot = watch.data;
  return (
    <WorkspacePage
      title="Zuno watch"
      description="Backup freshness, database availability, queue jobs, and recent API latency."
      technicalName="page.zuno.watch"
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => void watch.refetch()}
          disabled={watch.isFetching}
        >
          Refresh
        </Button>
      }
    >
      <div className="mx-auto max-w-5xl space-y-5 p-5">
        {watch.error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {watch.error.message}
          </p>
        ) : null}
        {watch.isLoading ? (
          <p role="status" className="text-sm">
            Checking operations…
          </p>
        ) : null}
        {snapshot ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                label="Queue failures"
                value={snapshot.queue.failed}
                detail={`Last ${snapshot.queue.sampleSize} jobs`}
                alert={snapshot.queue.failed > 0}
              />
              <Metric
                label="Queue pending"
                value={snapshot.queue.pending}
                detail={`${snapshot.queue.running} running`}
                alert={snapshot.queue.pending > 20}
              />
              <Metric
                label="API p95"
                value={snapshot.api.p95Ms === null ? "No sample" : `${snapshot.api.p95Ms} ms`}
                detail={`${snapshot.api.responseCount} responses · ${snapshot.api.errorCount} server errors`}
                alert={snapshot.api.p95Ms !== null && snapshot.api.p95Ms > 2000}
              />
            </div>
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Daily backup watch</h2>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href="/sa/master-database">Master backups</a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href="/sa/tenant-database">Tenant backups</a>
                  </Button>
                </div>
              </div>
              <WatchTargetsList targets={snapshot.targets} />
            </div>
            <p className="text-xs text-muted-foreground">
              Checked {new Date(snapshot.checkedAt).toLocaleString()}. Backup is fresh when a
              completed run is within 36 hours. This view does not prove restore validity. API
              metrics use recent log lines only.
            </p>
          </>
        ) : null}
      </div>
    </WorkspacePage>
  );
}

function Metric({
  label,
  value,
  detail,
  alert
}: {
  label: string;
  value: string | number;
  detail: string;
  alert: boolean;
}) {
  return (
    <section className={`rounded-md border bg-card p-4 ${alert ? "border-amber-500/60" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </section>
  );
}
