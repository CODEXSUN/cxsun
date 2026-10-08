import { useState } from "react";
import { Button } from "@cxsun/ui/components/button";
import { CasesWorkspace } from "./modules/cases/index.js";
import { ZunoWorkspace as DiagnosticsWorkspace } from "./modules/diagnostics/index.js";
import { WatchWorkspace } from "./modules/watch/index.js";

type ZunoSection = "watch" | "investigate" | "cases";

export function ZunoWorkspace() {
  const [section, setSection] = useState<ZunoSection>("watch");
  return (
    <div>
      <nav aria-label="Zuno sections" className="flex gap-2 border-b px-5 py-3">
        {(["watch", "investigate", "cases"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={section === item ? "default" : "ghost"}
            onClick={() => setSection(item)}
            className="capitalize"
          >
            {item}
          </Button>
        ))}
      </nav>
      {section === "watch" ? <WatchWorkspace /> : null}
      {section === "investigate" ? <DiagnosticsWorkspace /> : null}
      {section === "cases" ? <CasesWorkspace /> : null}
    </div>
  );
}
