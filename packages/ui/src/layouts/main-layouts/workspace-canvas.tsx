import type { ReactNode } from "react";

export function WorkspaceCanvas({ children }: { children?: ReactNode }) {
  return (
    <main aria-label="Workspace canvas" className="min-w-0 flex-1 bg-background">
      {children}
    </main>
  );
}
