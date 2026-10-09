import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRightIcon, CheckCircle2Icon, CopyIcon, LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@cxsun/ui/components/badge";
import { Button } from "@cxsun/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@cxsun/ui/components/tabs";
import { ZetroLogo } from "../../components/zetro-logo";
import {
  bindZetroLocalCodex,
  disconnectZetroCodex,
  getZetroCodexStatus,
  getZetroLocalCodexStatus,
  getZetroProviderSettings,
  saveZetroProviderSettings,
  startZetroCodexLogin
} from "./provider.services";

const providerQueryKey = ["zetro", "provider"] as const;
const codexQueryKey = ["zetro", "codex", "status"] as const;
const localCodexQueryKey = ["zetro", "codex", "local-status"] as const;

export function ZetroProviderSettingsWorkspace() {
  const client = useQueryClient();
  const savedAfterLogin = useRef(false);
  const [selectedTab, setSelectedTab] = useState<"device-code" | "local" | null>(null);
  const settings = useQuery({ queryKey: providerQueryKey, queryFn: getZetroProviderSettings });
  const codex = useQuery({
    queryKey: codexQueryKey,
    queryFn: getZetroCodexStatus,
    refetchInterval: (query) => (query.state.data?.pending ? 2_000 : false)
  });
  const localCodex = useQuery({
    queryKey: localCodexQueryKey,
    queryFn: getZetroLocalCodexStatus
  });
  const save = useMutation({
    mutationFn: () =>
      saveZetroProviderSettings({
        provider: "codex_cli",
        baseUrl: "",
        model: "",
        apiKey: ""
      }),
    onSuccess: async (result) => {
      client.setQueryData(providerQueryKey, result);
      await client.invalidateQueries({ queryKey: providerQueryKey });
      toast.success("Zetro connected to Codex CLI");
    },
    onError: (error) => {
      savedAfterLogin.current = false;
      toast.error("Could not save Zetro connection", { description: error.message });
    }
  });
  const login = useMutation({
    mutationFn: startZetroCodexLogin,
    onSuccess: (result) => client.setQueryData(codexQueryKey, result),
    onError: (error) =>
      toast.error("Could not start device sign-in", { description: error.message })
  });
  const disconnect = useMutation({
    mutationFn: disconnectZetroCodex,
    onSuccess: (result) => {
      client.setQueryData(codexQueryKey, result);
      toast.success("Zetro disconnected for this tenant");
    },
    onError: (error) => toast.error("Could not disconnect Zetro", { description: error.message })
  });
  const bindLocal = useMutation({
    mutationFn: bindZetroLocalCodex,
    onSuccess: (result) => {
      client.setQueryData(codexQueryKey, result);
      toast.success("Local Codex account bound to this tenant");
    },
    onError: (error) => toast.error("Could not bind local Codex", { description: error.message })
  });

  useEffect(() => {
    if (
      !codex.data?.signedIn ||
      !settings.data ||
      (settings.data.source === "tenant" && settings.data.provider === "codex_cli") ||
      savedAfterLogin.current
    )
      return;
    savedAfterLogin.current = true;
    save.mutate();
  }, [codex.data?.signedIn, settings.data, save]);

  const connected =
    codex.data?.signedIn &&
    settings.data?.source === "tenant" &&
    settings.data.provider === "codex_cli";
  const activeTab = selectedTab ?? codex.data?.connectionMethod ?? "device-code";

  return (
    <div
      className={`rounded-md border bg-card p-5 ${
        connected ? "border-emerald-400 dark:border-emerald-700" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div>
          <h2 className="text-lg font-semibold">Zetro connection</h2>
          <p className="text-sm text-muted-foreground">
            Connect this tenant to Codex CLI on the Platform API computer.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            connected
              ? "gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "gap-1.5 text-muted-foreground"
          }
          aria-live="polite"
        >
          {connected ? <CheckCircle2Icon aria-hidden="true" className="size-3.5" /> : null}
          {connected ? "Connected" : "Not connected"}
        </Badge>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setSelectedTab(value as "device-code" | "local")}
        className="pt-5"
      >
        <TabsList aria-label="Zetro connection methods">
          <TabsTrigger value="device-code">Device code</TabsTrigger>
          <TabsTrigger value="local">Local Codex</TabsTrigger>
        </TabsList>
        <TabsContent value="device-code" className="space-y-5 pt-3">
          <div className="flex items-start gap-3 rounded-md bg-muted/50 p-4">
            <ZetroLogo className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Connect with a device code</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in on OpenAI’s verification page with a one-time code. This tenant keeps its
                own Codex sign-in.
              </p>
            </div>
          </div>
          {settings.isLoading || codex.isLoading ? (
            <p className="text-sm text-muted-foreground">Checking Codex connection…</p>
          ) : settings.error || codex.error ? (
            <p role="alert" className="text-sm text-destructive">
              Could not check Zetro connection: {settings.error?.message ?? codex.error?.message}
            </p>
          ) : !codex.data?.installed ? (
            <p role="alert" className="text-sm text-destructive">
              Install Codex CLI on the Platform API computer to use device sign-in.
            </p>
          ) : connected ? (
            <p className="text-sm text-muted-foreground">
              {codex.data.connectionMethod === "local"
                ? "This tenant is connected through Local Codex. Open that tab to view the local account."
                : "This tenant is connected through a device code."}
            </p>
          ) : codex.data?.pending && codex.data.code ? (
            <div className="space-y-4 rounded-md border border-border p-4">
              <div>
                <p className="text-sm font-medium">Your one-time code</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use this code only for the sign-in you started here. It expires in 15 minutes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-md bg-muted px-4 py-2 text-xl font-semibold tracking-widest">
                  {codex.data.code}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(codex.data!.code!);
                    toast.success("Device code copied");
                  }}
                >
                  <CopyIcon aria-hidden="true" className="mr-2 size-4" /> Copy code
                </Button>
              </div>
              <a
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                href={codex.data.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open OpenAI device verification{" "}
                <ArrowUpRightIcon aria-hidden="true" className="size-4" />
              </a>
              <p className="text-xs text-muted-foreground">
                Paste the code on that page. This screen updates after Codex confirms sign-in.
              </p>
            </div>
          ) : codex.data?.signedIn ? (
            <p className="text-sm text-muted-foreground">Finishing the Zetro connection…</p>
          ) : (
            <Button type="button" disabled={login.isPending} onClick={() => login.mutate()}>
              {login.isPending ? "Generating code…" : "Generate device code"}
            </Button>
          )}
        </TabsContent>
        <TabsContent value="local" className="space-y-5 pt-3">
          <div className="flex items-start gap-3 rounded-md bg-muted/50 p-4">
            <ZetroLogo className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Connect with local Codex</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the Codex account already signed in on the Platform API computer. Binding copies
                its sign-in into this tenant’s protected Codex home.
              </p>
            </div>
          </div>
          {localCodex.isLoading ? (
            <p className="text-sm text-muted-foreground">Checking local Codex…</p>
          ) : localCodex.error ? (
            <p role="alert" className="text-sm text-destructive">
              Could not check local Codex: {localCodex.error.message}
            </p>
          ) : !localCodex.data?.installed ? (
            <p className="text-sm text-muted-foreground">
              Codex CLI is not installed on the Platform API computer.
            </p>
          ) : !localCodex.data.signedIn ? (
            <p className="text-sm text-muted-foreground">
              No local Codex account is signed in on the Platform API computer.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Local account available</p>
                <p className="break-all text-sm text-muted-foreground">
                  {localCodex.data.accountEmail ?? "Account email unavailable"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {localCodex.data.bindAvailable
                    ? "Binding replaces this tenant’s current Codex sign-in. The local account stays signed in."
                    : "This local sign-in has no file-based auth cache to bind. Use device code instead."}
                </p>
              </div>
              <Button
                type="button"
                disabled={
                  !localCodex.data.bindAvailable ||
                  bindLocal.isPending ||
                  (connected && codex.data?.connectionMethod === "local")
                }
                onClick={() => bindLocal.mutate()}
              >
                {bindLocal.isPending
                  ? "Binding…"
                  : connected && codex.data?.connectionMethod === "local"
                    ? "Bound to this tenant"
                    : "Bind local account"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      {connected ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <div className="min-w-0">
            <p className="text-sm font-medium">Connected account</p>
            <p className="break-all text-sm text-muted-foreground">
              {codex.data?.accountEmail ?? "Account email unavailable"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Zetro applies this tenant’s business permissions before answering record questions.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate()}
          >
            <LogOutIcon aria-hidden="true" className="mr-2 size-4" />
            {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
