import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Card } from "@cxsun/ui/components/card";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { UserMappingForm } from "./user-mapping.form";
import { userMappingsKey, useFrappeMappingUsers, useUserMappings } from "./user-mapping.hooks";
import { FrappeUserList, LocalUserList } from "./user-mapping.list";
import { removeUserMapping, saveUserMapping } from "./user-mapping.services";
import type { LocalMappingUser } from "./user-mapping.types";

export function FrappeUserMappingWorkspace() {
  const client = useQueryClient();
  const mappings = useUserMappings();
  const frappeUsers = useFrappeMappingUsers();
  const [localSearch, setLocalSearch] = useState("");
  const [remoteSearch, setRemoteSearch] = useState("");
  const [selectedLocalId, setSelectedLocalId] = useState<number | null>(null);
  const [selectedRemoteId, setSelectedRemoteId] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: saveUserMapping,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: userMappingsKey });
      toast.success("User mapping saved");
    },
    onError: (error) => toast.error("Unable to save mapping", { description: error.message })
  });
  const remove = useMutation({
    mutationFn: removeUserMapping,
    onSuccess: async () => {
      setSelectedRemoteId(null);
      await client.invalidateQueries({ queryKey: userMappingsKey });
      toast.success("User mapping removed");
    },
    onError: (error) => toast.error("Unable to remove mapping", { description: error.message })
  });
  const localUsers = mappings.data?.localUsers ?? [];
  const links = mappings.data?.links ?? [];
  const remoteUsers = frappeUsers.data ?? [];
  const selectedLocal = localUsers.find((user) => user.id === selectedLocalId) ?? null;
  const selectedRemote = remoteUsers.find((user) => user.frappeUserId === selectedRemoteId) ?? null;
  const current = links.find((link) => link.localUserId === selectedLocalId) ?? null;
  const linkedCount = links.filter((link) => link.connectionCurrent).length;

  function selectLocal(user: LocalMappingUser) {
    setSelectedLocalId(user.id);
    const saved = links.find((link) => link.localUserId === user.id && link.connectionCurrent);
    const suggested = remoteUsers.find(
      (remote) => remote.email.toLowerCase() === user.email.toLowerCase()
    );
    setSelectedRemoteId(saved?.frappeUserId ?? suggested?.frappeUserId ?? null);
  }

  return (
    <WorkspacePage
      title="Frappe user mapping"
      description="Link local application users to Frappe identities and employee codes. Local sign-in remains local."
      technicalName="page.frappe.user-mapping"
      actions={
        <Button
          variant="outline"
          disabled={mappings.isFetching || frappeUsers.isFetching}
          onClick={() => {
            void mappings.refetch();
            void frappeUsers.refetch();
          }}
        >
          <RefreshCw className="size-4" /> Refresh
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <CountCard label="Application users" value={localUsers.length} />
        <CountCard label="Linked" value={linkedCount} />
        <CountCard label="Unlinked" value={Math.max(0, localUsers.length - linkedCount)} />
      </div>
      {mappings.error ? (
        <p role="alert" className="text-sm text-destructive">
          {mappings.error.message}
        </p>
      ) : null}
      {frappeUsers.error ? (
        <p role="alert" className="text-sm text-destructive">
          Frappe users: {frappeUsers.error.message}
        </p>
      ) : null}
      <UserMappingForm
        local={selectedLocal}
        remote={selectedRemote}
        current={current}
        busy={save.isPending || remove.isPending}
        onSave={() => {
          if (selectedLocalId && selectedRemoteId)
            save.mutate({ localUserId: selectedLocalId, frappeUserId: selectedRemoteId });
        }}
        onRemove={() => {
          if (selectedLocalId) remove.mutate(selectedLocalId);
        }}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <LocalUserList
          users={localUsers}
          links={links}
          selectedId={selectedLocalId}
          search={localSearch}
          onSearch={setLocalSearch}
          onSelect={selectLocal}
        />
        <FrappeUserList
          users={remoteUsers}
          links={links}
          selectedLocalId={selectedLocalId}
          selectedId={selectedRemoteId}
          search={remoteSearch}
          onSearch={setRemoteSearch}
          onSelect={(user) => setSelectedRemoteId(user.frappeUserId)}
        />
      </div>
    </WorkspacePage>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
