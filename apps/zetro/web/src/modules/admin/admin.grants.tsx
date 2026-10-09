import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import {
  listZetroGrants,
  listZetroRoles,
  saveZetroGrant,
  zetroCapabilityLabels,
  zetroCapabilities,
  type ZetroGrantChange
} from "./admin.services";

export function ZetroGrantSection({ tenantId }: { tenantId: string }) {
  const client = useQueryClient();
  const [change, setChange] = useState<ZetroGrantChange>({
    roleKey: "",
    capabilityKey: "billing.daily-summary.read",
    status: "active",
    reason: ""
  });
  const grants = useQuery({
    queryKey: ["zetro", "admin", tenantId, "grants"],
    queryFn: () => listZetroGrants(tenantId)
  });
  const roles = useQuery({
    queryKey: ["zetro", "admin", tenantId, "roles"],
    queryFn: () => listZetroRoles(tenantId)
  });
  const save = useMutation({
    mutationFn: () => saveZetroGrant(tenantId, change),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["zetro", "admin", tenantId, "grants"] });
      setChange((value) => ({ ...value, reason: "" }));
      toast.success("Role access updated");
    },
    onError: (error) => toast.error("Could not update role access", { description: error.message })
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-lg font-semibold">Business read permissions</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A role needs this grant and Billing records permission. No report grant is active by
        default.
      </p>
      {grants.error ? <p role="alert">{grants.error.message}</p> : null}
      {roles.error ? <p role="alert">{roles.error.message}</p> : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="p-2">Role</th>
              <th className="p-2">Read</th>
              <th className="p-2">Status</th>
              <th className="p-2">Approved by</th>
            </tr>
          </thead>
          <tbody>
            {grants.data?.map((grant) => (
              <tr key={`${grant.role_key}:${grant.capability_key}`} className="border-b">
                <td className="p-2">{grant.role_key}</td>
                <td className="p-2">
                  {zetroCapabilityLabels[
                    grant.capability_key as ZetroGrantChange["capabilityKey"]
                  ] ?? grant.capability_key}
                </td>
                <td className="p-2">{grant.status}</td>
                <td className="p-2">{grant.approved_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {grants.data?.length === 0 ? <p className="p-2 text-sm">No role grants yet.</p> : null}
      </div>
      <form className="mt-4 grid gap-3 md:grid-cols-[10rem_1fr_8rem_1fr_auto]" onSubmit={submit}>
        <select
          aria-label="Tenant role key"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={change.roleKey}
          required
          onChange={(event) => setChange((value) => ({ ...value, roleKey: event.target.value }))}
        >
          <option value="">Select role</option>
          {roles.data?.map((role) => (
            <option key={role.role_key} value={role.role_key}>
              {role.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Business read"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={change.capabilityKey}
          onChange={(event) =>
            setChange((value) => ({
              ...value,
              capabilityKey: event.target.value as ZetroGrantChange["capabilityKey"]
            }))
          }
        >
          {zetroCapabilities.map((capability) => (
            <option key={capability} value={capability}>
              {zetroCapabilityLabels[capability]}
            </option>
          ))}
        </select>
        <select
          aria-label="Grant status"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={change.status}
          onChange={(event) =>
            setChange((value) => ({
              ...value,
              status: event.target.value as ZetroGrantChange["status"]
            }))
          }
        >
          <option value="active">Allow</option>
          <option value="revoked">Revoke</option>
        </select>
        <Input
          aria-label="Reason for access decision"
          placeholder="Reason"
          value={change.reason}
          maxLength={500}
          required
          onChange={(event) => setChange((value) => ({ ...value, reason: event.target.value }))}
        />
        <Button disabled={save.isPending} type="submit">
          Save
        </Button>
      </form>
    </section>
  );
}
