import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { SparklesIcon, XIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { ZetroChatPanel } from "./chat.workspace";

export function ZetroChatDrawer({ scopeKey }: { scopeKey: string }) {
  const [open, setOpen] = useState(false);
  const [drawerPosition, setDrawerPosition] = useState<CSSProperties>({
    top: 104,
    right: 12,
    bottom: 36,
    width: "min(28rem, calc(100vw - 1.5rem))"
  });

  useLayoutEffect(() => {
    if (!open) return;
    const workspace = document.querySelector('[aria-label="Workspace canvas"]');
    if (!workspace) return;

    const positionInWorkspace = () => {
      const bounds = workspace.getBoundingClientRect();
      setDrawerPosition({
        top: Math.max(58, bounds.top + 12),
        right: Math.max(12, window.innerWidth - bounds.right + 12),
        bottom: Math.max(12, window.innerHeight - bounds.bottom + 12),
        width: "min(28rem, calc(100vw - 1.5rem))"
      });
    };
    const observer = new ResizeObserver(positionInWorkspace);
    observer.observe(workspace);
    window.addEventListener("resize", positionInWorkspace);
    positionInWorkspace();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", positionInWorkspace);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        title="Zetro"
        aria-controls="zetro-drawer"
        aria-expanded={open}
        aria-label={open ? "Close Zetro" : "Open Zetro"}
        className="size-8 shrink-0 rounded-full"
        size="icon"
        variant={open ? "secondary" : "ghost"}
        onClick={() => setOpen((value) => !value)}
      >
        <SparklesIcon className="size-4" />
      </Button>
      {open
        ? createPortal(
            <aside
              id="zetro-drawer"
              aria-label="Zetro business assistant"
              className="fixed z-50 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background shadow-xl"
              style={drawerPosition}
            >
              <div className="flex items-center justify-between border-b px-4 py-2">
                <div>
                  <h2 className="text-sm font-semibold">Zetro</h2>
                  <p className="text-xs text-muted-foreground">Your business coworker</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Close Zetro"
                  onClick={() => setOpen(false)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <ZetroChatPanel scopeKey={scopeKey} compact />
              </div>
            </aside>,
            document.body
          )
        : null}
    </>
  );
}
