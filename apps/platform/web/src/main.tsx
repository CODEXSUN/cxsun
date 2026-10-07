import { createRoot } from "react-dom/client";
import { GlobalLoader } from "@cxsun/ui/components/global-loader";
import "@cxsun/ui/styles.css";
import "./styles.css";
import { loadRuntimeConfig } from "./startup-config";

const root = createRoot(document.getElementById("root") as HTMLElement);

async function start() {
  root.render(<GlobalLoader />);
  try {
    window.__CXSUN_RUNTIME_CONFIG__ = Object.freeze(await loadRuntimeConfig());
    const { PlatformWebApp } = await import("./app/PlatformWebApp");
    root.render(<PlatformWebApp />);
  } catch {
    root.render(
      <main className="simple-page" role="alert">
        <h1>Unable to connect to the application</h1>
        <p>Check that the Platform API is running, then try again.</p>
        <button type="button" onClick={() => void start()}>
          Retry connection
        </button>
      </main>
    );
  }
}

void start();
