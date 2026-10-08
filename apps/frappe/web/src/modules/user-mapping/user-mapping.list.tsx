import { Card } from "@cxsun/ui/components/card";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import type { FrappeMappingUser, LocalMappingUser, UserMapping } from "./user-mapping.types";

export function LocalUserList({
  users,
  links,
  selectedId,
  search,
  onSearch,
  onSelect
}: {
  users: LocalMappingUser[];
  links: UserMapping[];
  selectedId: number | null;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (user: LocalMappingUser) => void;
}) {
  const visible = users.filter((user) =>
    [user.name, user.email].some((value) => value.toLowerCase().includes(search.toLowerCase()))
  );
  const byUser = new Map(links.map((link) => [link.localUserId, link]));
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="space-y-3 border-b p-4">
        <div>
          <h2 className="font-semibold">Application users</h2>
          <p className="text-xs text-muted-foreground">Select a local account.</p>
        </div>
        <Input
          aria-label="Search application users"
          placeholder="Search application users"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      <div className="max-h-[520px] space-y-1 overflow-y-auto p-2">
        {visible.map((user) => {
          const link = byUser.get(user.id);
          return (
            <button
              key={user.id}
              type="button"
              aria-pressed={selectedId === user.id}
              onClick={() => onSelect(user)}
              className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left hover:bg-muted/60 ${selectedId === user.id ? "border-primary bg-primary/5" : "border-transparent"}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <WorkspaceStatusBadge
                label={link ? (link.connectionCurrent ? "Linked" : "Review") : "Unlinked"}
                tone={link?.connectionCurrent ? "success" : "warning"}
              />
            </button>
          );
        })}
        {visible.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No application users found.</p>
        ) : null}
      </div>
    </Card>
  );
}

export function FrappeUserList({
  users,
  links,
  selectedLocalId,
  selectedId,
  search,
  onSearch,
  onSelect
}: {
  users: FrappeMappingUser[];
  links: UserMapping[];
  selectedLocalId: number | null;
  selectedId: string | null;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (user: FrappeMappingUser) => void;
}) {
  const visible = users.filter((user) =>
    [user.name, user.email, user.employeeCode ?? ""].some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    )
  );
  const byRemote = new Map(
    links.filter((link) => link.connectionCurrent).map((link) => [link.frappeUserId, link])
  );
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="space-y-3 border-b p-4">
        <div>
          <h2 className="font-semibold">Frappe users</h2>
          <p className="text-xs text-muted-foreground">Select the matching Frappe identity.</p>
        </div>
        <Input
          aria-label="Search Frappe mapping users"
          placeholder="Search Frappe users or employee codes"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      <div className="max-h-[520px] space-y-1 overflow-y-auto p-2">
        {visible.map((user) => {
          const link = byRemote.get(user.frappeUserId);
          const assignedElsewhere = link && link.localUserId !== selectedLocalId;
          return (
            <button
              key={user.frappeUserId}
              type="button"
              aria-pressed={selectedId === user.frappeUserId}
              disabled={Boolean(assignedElsewhere)}
              onClick={() => onSelect(user)}
              className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50 ${selectedId === user.frappeUserId ? "border-primary bg-primary/5" : "border-transparent"}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {assignedElsewhere ? "Linked" : user.employeeCode || "No employee"}
              </span>
            </button>
          );
        })}
        {visible.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No Frappe users found.</p>
        ) : null}
      </div>
    </Card>
  );
}
