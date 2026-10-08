import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@cxsun/ui/components/dialog";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { FrappeUserList } from "./user-sync.list";
import { FrappeUserImportForm } from "./user-sync.form";
import { frappeUsersKey, useFrappeUsers } from "./user-sync.hooks";
import { importFrappeUser } from "./user-sync.services";
import type { FrappeUserPreview } from "./user-sync.types";

export function FrappeUserSyncWorkspace() {
  const client = useQueryClient();
  const preview = useFrappeUsers();
  const [search, setSearch] = useState("");
  const [password, setPassword] = useState<string | null>(null);
  const [importedName, setImportedName] = useState("");
  const [selectedUser, setSelectedUser] = useState<FrappeUserPreview | null>(null);
  const importUser = useMutation({
    mutationFn: ({ user, password }: { user: FrappeUserPreview; password?: string }) =>
      importFrappeUser({ frappeUserId: user.frappeUserId, ...(password ? { password } : {}) }),
    onSuccess: async (result, { user, password: customPassword }) => {
      await client.invalidateQueries({ queryKey: frappeUsersKey });
      setSelectedUser(null);
      if (result.status === "already-exists") {
        toast.info("User already exists locally", { description: user.email });
      } else {
        if (result.password) {
          setImportedName(user.name);
          setPassword(result.password);
        }
        toast.success("Frappe user added", {
          description: customPassword ? `${user.email} · Custom password set` : user.email
        });
      }
      importUser.reset();
    },
    onError: (error) => {
      toast.error("Unable to add Frappe user", { description: error.message });
      importUser.reset();
    }
  });
  const users = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = preview.data ?? [];
    return term
      ? items.filter((user) =>
          [user.name, user.email, user.frappeUserId, user.employeeCode ?? ""].some((value) =>
            value.toLowerCase().includes(term)
          )
        )
      : items;
  }, [preview.data, search]);

  return (
    <WorkspacePage
      title="Frappe user sync"
      description="Preview enabled Frappe System Users and add them to this application."
      technicalName="page.frappe.user-sync"
      actions={
        <Button
          variant="outline"
          onClick={() => void preview.refetch()}
          disabled={preview.isFetching}
        >
          <RefreshCw className="size-4" /> Refresh preview
        </Button>
      }
    >
      <div className="max-w-xl">
        <Input
          aria-label="Search Frappe users"
          placeholder="Search Frappe users"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {preview.error ? (
        <p role="alert" className="text-sm text-destructive">
          {preview.error.message}
        </p>
      ) : null}
      {!preview.error ? (
        <FrappeUserList
          users={users}
          loading={preview.isLoading}
          importingId={
            importUser.isPending ? (importUser.variables?.user.frappeUserId ?? null) : null
          }
          onImport={setSelectedUser}
        />
      ) : null}
      {preview.data ? (
        <p className="text-xs text-muted-foreground">
          Showing {users.length} of {preview.data.length} Frappe users
        </p>
      ) : null}
      <Dialog
        open={selectedUser !== null}
        onOpenChange={(open) => !open && !importUser.isPending && setSelectedUser(null)}
      >
        {selectedUser ? (
          <FrappeUserImportForm
            user={selectedUser}
            pending={importUser.isPending}
            onCancel={() => setSelectedUser(null)}
            onSubmit={(customPassword) =>
              importUser.mutate({
                user: selectedUser,
                ...(customPassword === undefined ? {} : { password: customPassword })
              })
            }
          />
        ) : null}
      </Dialog>
      <Dialog open={password !== null} onOpenChange={(open) => !open && setPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{importedName} added</DialogTitle>
            <DialogDescription>
              Copy this temporary password now. It is shown only once.
            </DialogDescription>
          </DialogHeader>
          <Input aria-label="Temporary password" value={password ?? ""} readOnly />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(password ?? "")}
            >
              Copy password
            </Button>
            <Button onClick={() => setPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}
