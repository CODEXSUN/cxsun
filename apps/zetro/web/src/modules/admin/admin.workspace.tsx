import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { Textarea } from "@cxsun/ui/components/textarea";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import {
  createZetroPatternDraft,
  listZetroInteractions,
  listZetroPatterns,
  listZetroTenants,
  type ZetroPatternDraft
} from "./admin.services";
import { ZetroGrantSection } from "./admin.grants";

const emptyDraft: ZetroPatternDraft = {
  serialNo: 7,
  questionPattern: "",
  queryPattern: "",
  limitation: "",
  extra: ""
};

export function ZetroAdminWorkspace() {
  const client = useQueryClient();
  const [tenantId, setTenantId] = useState("");
  const [draft, setDraft] = useState<ZetroPatternDraft>(emptyDraft);
  const tenants = useQuery({ queryKey: ["zetro", "admin", "tenants"], queryFn: listZetroTenants });
  const availableTenants = tenants.data?.filter((tenant) =>
    tenant.enabledModuleKeys.includes("zetro")
  );

  useEffect(() => {
    if (!tenantId && availableTenants?.[0]) setTenantId(availableTenants[0].uuid);
  }, [availableTenants, tenantId]);

  useEffect(() => {
    setDraft(emptyDraft);
  }, [tenantId]);

  const patterns = useQuery({
    queryKey: ["zetro", "admin", tenantId, "patterns"],
    queryFn: () => listZetroPatterns(tenantId),
    enabled: Boolean(tenantId)
  });
  const interactions = useQuery({
    queryKey: ["zetro", "admin", tenantId, "interactions"],
    queryFn: () => listZetroInteractions(tenantId),
    enabled: Boolean(tenantId),
    refetchInterval: 15_000
  });
  const createDraft = useMutation({
    mutationFn: () => createZetroPatternDraft(tenantId, draft),
    onSuccess: () => {
      setDraft({ ...emptyDraft, serialNo: draft.serialNo + 1 });
      void client.invalidateQueries({ queryKey: ["zetro", "admin", tenantId, "patterns"] });
      toast.success("Draft pattern added for review");
    },
    onError: (error) => toast.error("Could not add pattern", { description: error.message })
  });
  const patternNumber = new Map(patterns.data?.map((item) => [item.uuid, item.serial_no]));

  const submitDraft = (event: FormEvent) => {
    event.preventDefault();
    if (!tenantId) return;
    createDraft.mutate();
  };

  return (
    <WorkspacePage
      title="Zetro"
      description="Review tenant query patterns and live interactions. Drafts do not enable tools."
      technicalName="page.sa.zetro"
    >
      <div className="space-y-5 p-5">
        <section className="rounded-lg border bg-card p-4">
          <label htmlFor="zetro-review-tenant" className="mb-2 block text-sm font-medium">
            Tenant
          </label>
          <select
            id="zetro-review-tenant"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            className="h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm"
          >
            {!tenantId ? <option value="">Select a tenant</option> : null}
            {availableTenants?.map((tenant) => (
              <option key={tenant.uuid} value={tenant.uuid}>
                {tenant.tenantName} ({tenant.tenantCode})
              </option>
            ))}
          </select>
          {tenants.error ? <p role="alert">{tenants.error.message}</p> : null}
          {availableTenants?.length === 0 ? <p>No tenant has Zetro enabled.</p> : null}
        </section>

        {tenantId ? (
          <>
            <section className="rounded-lg border bg-card p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Numbered query patterns</h2>
                <Button variant="outline" size="sm" onClick={() => void patterns.refetch()}>
                  Refresh
                </Button>
              </div>
              {patterns.error ? <p role="alert">{patterns.error.message}</p> : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[58rem] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">UUID</th>
                      <th className="p-2">Question pattern</th>
                      <th className="p-2">Query pattern</th>
                      <th className="p-2">Limitation</th>
                      <th className="p-2">Extra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patterns.data?.map((item) => (
                      <tr key={item.uuid} className="border-b align-top">
                        <td className="p-2 font-medium">{item.serial_no}</td>
                        <td className="p-2 font-mono text-xs break-all">{item.uuid}</td>
                        <td className="p-2">{item.question_pattern}</td>
                        <td className="p-2 font-mono text-xs">{item.query_pattern}</td>
                        <td className="p-2">{item.limitation}</td>
                        <td className="p-2">
                          {item.extra}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({item.status})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <form onSubmit={submitDraft} className="space-y-3 rounded-lg border bg-card p-4">
              <h2 className="text-lg font-semibold">Add a draft pattern</h2>
              <p className="text-sm text-muted-foreground">
                A draft is review data. A new live query needs a backend contract and approval.
              </p>
              <div className="grid gap-3 md:grid-cols-[8rem_1fr_1fr]">
                <Input
                  aria-label="Serial number"
                  type="number"
                  min={7}
                  value={draft.serialNo}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, serialNo: Number(event.target.value) }))
                  }
                  required
                />
                <Input
                  aria-label="Question pattern"
                  placeholder="Question pattern"
                  value={draft.questionPattern}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, questionPattern: event.target.value }))
                  }
                  required
                />
                <Input
                  aria-label="Query pattern key"
                  placeholder="Named backend contract key"
                  value={draft.queryPattern}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, queryPattern: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  aria-label="Limitation"
                  placeholder="Limitation"
                  value={draft.limitation}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, limitation: event.target.value }))
                  }
                  required
                />
                <Textarea
                  aria-label="Extra notes"
                  placeholder="Extra notes"
                  value={draft.extra}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, extra: event.target.value }))
                  }
                  maxLength={2000}
                />
              </div>
              <Button type="submit" disabled={createDraft.isPending}>
                Save draft
              </Button>
            </form>

            <ZetroGrantSection key={tenantId} tenantId={tenantId} />

            <section className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Live interaction review</h2>
                  <p className="text-sm text-muted-foreground">
                    Latest 100 requests. Refreshes every 15 seconds.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void interactions.refetch()}>
                  Refresh
                </Button>
              </div>
              {interactions.error ? <p role="alert">{interactions.error.message}</p> : null}
              {interactions.data?.length === 0 ? <p>No interactions recorded yet.</p> : null}
              <div className="space-y-3">
                {interactions.data?.map((item) => (
                  <article key={item.id} className="rounded-md border p-3 text-sm">
                    <p className="mb-2 text-xs text-muted-foreground">
                      #{item.pattern_uuid ? (patternNumber.get(item.pattern_uuid) ?? "?") : "?"} ·{" "}
                      {item.outcome} · {item.skill_decision ?? item.intent} · {item.actor_email} ·{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                    <p className="whitespace-pre-wrap break-words">
                      <strong>User:</strong> {item.prompt_text}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words">
                      <strong>Zetro:</strong> {item.response_text ?? "No response recorded"}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </WorkspacePage>
  );
}
