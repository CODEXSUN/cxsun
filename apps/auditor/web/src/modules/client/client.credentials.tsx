import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { GlobalLoader } from "@cxsun/ui/components/global-loader";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceShowCard } from "@cxsun/ui/workspace/show";
import {
  WorkspaceTableHeaderCell,
  workspaceTableCellClass,
  workspaceTableRowClass
} from "@cxsun/ui/workspace/table";
import { auditorClientCredentialsQueryKey, useAuditorClientCredentials } from "./client.hooks";
import type { AuditorClientGateway } from "./client.services";
import type { AuditorClientCredential, AuditorCredentialPortal } from "./client.types";

const portalLabels: Record<AuditorCredentialPortal, string> = {
  gstin: "GSTIN",
  eway: "E-Way Bill",
  einvoice: "E-Invoice",
  accounts: "Accounts"
};

export function AuditorClientCredentials({
  clientId,
  gateway
}: {
  clientId: number;
  gateway: AuditorClientGateway;
}) {
  const query = useAuditorClientCredentials(gateway, clientId);
  return (
    <WorkspaceShowCard title="Portal credentials">
      {query.error ? (
        <div role="alert" className="flex items-center gap-3 px-4 py-3 text-sm text-destructive">
          <span>{query.error.message}</span>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {query.isLoading ? <GlobalLoader className="min-h-32" fullScreen={false} /> : null}
      {query.data ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <WorkspaceTableHeaderCell>Portal</WorkspaceTableHeaderCell>
                <WorkspaceTableHeaderCell>User / Email</WorkspaceTableHeaderCell>
                <WorkspaceTableHeaderCell>Password</WorkspaceTableHeaderCell>
                <WorkspaceTableHeaderCell>Action</WorkspaceTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {query.data.map((entry) => (
                <CredentialRow
                  key={`${entry.portal}:${entry.updatedAt ?? "new"}`}
                  clientId={clientId}
                  entry={entry}
                  gateway={gateway}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </WorkspaceShowCard>
  );
}

function CredentialRow({
  clientId,
  entry,
  gateway
}: {
  clientId: number;
  entry: AuditorClientCredential;
  gateway: AuditorClientGateway;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(entry.username ?? "");
  const [password, setPassword] = useState<string | null>(null);
  const [draftPassword, setDraftPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const visibleUsername = editing ? username.trim() : (entry.username ?? "");
  const visiblePassword = editing ? draftPassword : password;
  useEffect(() => {
    if (!entry.hasPassword) return;
    let active = true;
    gateway.revealCredential(clientId, entry.portal).then(
      (value) => {
        if (active) setPassword(value);
      },
      () => {
        if (active) setPasswordError(true);
      }
    );
    return () => {
      active = false;
    };
  }, [clientId, entry.hasPassword, entry.portal, gateway]);
  const save = useMutation({
    mutationFn: () =>
      gateway.saveCredential(clientId, entry.portal, {
        username: username.trim(),
        ...(draftPassword ? { password: draftPassword } : {})
      }),
    onSuccess: async () => {
      setEditing(false);
      setDraftPassword("");
      await queryClient.invalidateQueries({ queryKey: auditorClientCredentialsQueryKey(clientId) });
      toast.success(`${portalLabels[entry.portal]} credentials saved`);
    },
    onError: (error) => toast.error("Unable to save credentials", { description: error.message })
  });
  const startEditing = () => {
    setDraftPassword(password ?? "");
    setEditing(true);
  };
  const saveCredential = () => {
    if (!username.trim()) {
      toast.error("Username or email is required.");
      return;
    }
    if (entry.portal === "accounts" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username.trim())) {
      toast.error("Enter a valid Accounts email address.");
      return;
    }
    if (!entry.hasPassword && !draftPassword) {
      toast.error("Password is required for a new portal credential.");
      return;
    }
    save.mutate();
  };
  return (
    <tr className={workspaceTableRowClass}>
      <th
        scope="row"
        className={`${workspaceTableCellClass} whitespace-nowrap text-left font-medium`}
      >
        {portalLabels[entry.portal]}
      </th>
      <td className={workspaceTableCellClass}>
        <div className="flex items-center gap-2">
          {editing ? (
            <Input
              aria-label={`${portalLabels[entry.portal]} ${entry.portal === "accounts" ? "email" : "username"}`}
              autoComplete="off"
              type={entry.portal === "accounts" ? "email" : "text"}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          ) : (
            <span className="min-w-0 flex-1 break-all">{entry.username || "—"}</span>
          )}
          <CopyButton
            label={`Copy ${portalLabels[entry.portal]} username`}
            disabled={!visibleUsername}
            onClick={() => void copyText(visibleUsername, "Username")}
          />
        </div>
      </td>
      <td className={workspaceTableCellClass}>
        <div className="flex items-center gap-2">
          {editing ? (
            <Input
              aria-label={`${portalLabels[entry.portal]} password`}
              autoComplete="off"
              type="text"
              value={draftPassword}
              onChange={(event) => setDraftPassword(event.target.value)}
            />
          ) : (
            <span className="min-w-0 flex-1 break-all">
              {password ??
                (passwordError ? "Unable to load" : entry.hasPassword ? "Loading…" : "—")}
            </span>
          )}
          <CopyButton
            label={`Copy ${portalLabels[entry.portal]} password`}
            disabled={!visiblePassword}
            onClick={() => void copyText(visiblePassword ?? "", "Password")}
          />
        </div>
      </td>
      <td className={workspaceTableCellClass}>
        {editing ? (
          <Button
            type="button"
            size="icon"
            aria-label={`Save ${portalLabels[entry.portal]} credentials`}
            title="Save"
            disabled={save.isPending}
            onClick={saveCredential}
          >
            <Save className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={`Edit ${portalLabels[entry.portal]} credentials`}
            title="Edit"
            onClick={startEditing}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}

function CopyButton({
  label,
  disabled,
  onClick
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      title={label}
      type="button"
      size="icon"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
    >
      <Copy className="size-4" />
    </Button>
  );
}

async function copyText(value: string, label: string) {
  try {
    await writeClipboard(value);
    toast.success(`${label} copied`);
  } catch (error) {
    toast.error("Unable to copy", { description: errorMessage(error) });
  }
}

async function writeClipboard(value: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard access requires a secure browser context.");
  }
  await navigator.clipboard.writeText(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}
