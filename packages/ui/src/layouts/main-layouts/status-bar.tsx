export function StatusBar({ status, workspace }: { status: string; workspace: string }) {
  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t px-3 text-xs text-muted-foreground">
      <span>{status}</span>
      <span>{workspace}</span>
    </footer>
  );
}
