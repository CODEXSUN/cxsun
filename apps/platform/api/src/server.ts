import { registerGracefulShutdown, startApiServer } from "@cxsun/framework/api";
import { createApp } from "./app.js";
import { env, platformRuntime } from "./env.js";
import { startDevShutdownControl } from "./dev-shutdown.js";
import { verifyStartupConnectivity } from "./startup-smoke.js";

let stopRequested = false;
let shutdownDispatched = false;
let requestShutdown: ((signal: NodeJS.Signals) => void) | undefined;
function dispatchShutdown() {
  if (!requestShutdown || shutdownDispatched) return;
  shutdownDispatched = true;
  requestShutdown("SIGTERM");
}
const earlySignals = new Map<NodeJS.Signals, () => void>();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  const handler = () => {
    stopRequested = true;
    console.info(`[shutdown] ${signal} received during startup; finishing initialization`);
  };
  earlySignals.set(signal, handler);
  process.on(signal, handler);
}
function removeEarlySignals() {
  for (const [signal, handler] of earlySignals) process.off(signal, handler);
  earlySignals.clear();
}
const closeControl = await startDevShutdownControl(() => {
  stopRequested = true;
  dispatchShutdown();
});

try {
  await verifyStartupConnectivity();
  const app = await createApp();
  removeEarlySignals();
  requestShutdown = registerGracefulShutdown(app, { hooks: [closeControl] });
  if (stopRequested) {
    dispatchShutdown();
  } else {
    await startApiServer({
      app,
      host: platformRuntime.apiBindHost,
      port: env.PLATFORM_API_PORT,
      readyLabel: "  ok api ready: {address}"
    });
  }
} catch (error) {
  removeEarlySignals();
  await closeControl();
  throw error;
}
