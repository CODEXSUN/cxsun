import type { ReactNode } from "react";

export type AppLayoutProps = {
  children: ReactNode;
  className?: string;
};

/** Base surface for an authenticated application shell. Auth stays with the host app. */
export function AppLayout({ children, className = "" }: AppLayoutProps) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden bg-background text-foreground ${className}`}
    >
      {children}
    </div>
  );
}
