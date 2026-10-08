import { ArrowRight } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Card } from "@cxsun/ui/components/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@cxsun/ui/components/alert-dialog";
import type { FrappeMappingUser, LocalMappingUser, UserMapping } from "./user-mapping.types";

export function UserMappingForm({
  local,
  remote,
  current,
  busy,
  onSave,
  onRemove
}: {
  local: LocalMappingUser | null;
  remote: FrappeMappingUser | null;
  current: UserMapping | null;
  busy: boolean;
  onSave: () => void;
  onRemove: () => void;
}) {
  const emailDiffers = Boolean(
    local && remote && local.email.toLowerCase() !== remote.email.toLowerCase()
  );
  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Application user</p>
          <p className="truncate text-sm font-medium">{local?.name || "Select a local user"}</p>
          {local ? <p className="truncate text-xs text-muted-foreground">{local.email}</p> : null}
        </div>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Frappe user</p>
          <p className="truncate text-sm font-medium">{remote?.name || "Select a Frappe user"}</p>
          {remote ? (
            <p className="truncate text-xs text-muted-foreground">
              {remote.email} · {remote.employeeCode || "No employee code"}
            </p>
          ) : null}
        </div>
      </div>
      {emailDiffers ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          These email addresses differ. Check the identities before saving the link.
        </p>
      ) : null}
      {current && !current.connectionCurrent ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          This saved link belongs to a different Frappe connection. Select and save a user from the
          current site.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!local || !remote || busy} onClick={onSave}>
          {busy ? "Saving…" : current ? "Save mapping" : "Link users"}
        </Button>
        {current ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={busy}>
                Remove mapping
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this user mapping?</AlertDialogTitle>
                <AlertDialogDescription>
                  The local account stays in this application. You can link it again later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove}>Remove mapping</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </Card>
  );
}
