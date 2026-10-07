import type { FastifyInstance } from "fastify";

export type ShutdownHook = () => Promise<void> | void;

export type GracefulShutdownOptions = {
  hooks?: ShutdownHook[];
  signals?: NodeJS.Signals[];
  timeoutMs?: number;
};

type ShutdownState = {
  shuttingDown: boolean;
};

const shutdownState = new WeakMap<FastifyInstance, ShutdownState>();

function getShutdownState(app: FastifyInstance): ShutdownState {
  let state = shutdownState.get(app);

  if (!state) {
    state = { shuttingDown: false };
    shutdownState.set(app, state);
  }

  return state;
}

export function registerShutdownHooks(app: FastifyInstance, hooks: ShutdownHook[]): void {
  for (const hook of hooks) {
    app.addHook("onClose", async () => {
      await hook();
    });
  }
}

export function registerGracefulShutdown(
  app: FastifyInstance,
  options: GracefulShutdownOptions = {}
): (signal: NodeJS.Signals) => void {
  const signals = options.signals ?? ["SIGTERM", "SIGINT"];
  const timeoutMs = options.timeoutMs ?? 30_000;

  if (options.hooks?.length) {
    registerShutdownHooks(app, options.hooks);
  }

  const shutdown = async (signal: NodeJS.Signals) => {
    const state = getShutdownState(app);

    if (state.shuttingDown) {
      app.log.warn({ signal }, "Shutdown already in progress");
      return;
    }

    state.shuttingDown = true;
    console.info(`[shutdown] graceful shutdown started (${signal})`);
    app.log.info({ signal }, "Graceful shutdown started");

    const forceExitTimer = setTimeout(() => {
      console.error(`[shutdown] timed out after ${timeoutMs}ms; forcing exit`);
      app.log.error({ timeoutMs }, "Graceful shutdown timed out; forcing exit");
      process.exit(1);
    }, timeoutMs);

    forceExitTimer.unref();

    try {
      console.info("[shutdown] closing HTTP listeners and application resources");
      app.log.info("Closing HTTP listeners");
      await app.close();
      console.info("[shutdown] HTTP listeners and application resources closed");
      app.log.info("HTTP listeners closed and shutdown hooks completed");
      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (error) {
      console.error("[shutdown] graceful shutdown failed", error);
      app.log.error({ err: error }, "Graceful shutdown failed");
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  const requestShutdown = (signal: NodeJS.Signals) => {
    void shutdown(signal);
  };
  for (const signal of signals) process.once(signal, () => requestShutdown(signal));
  return requestShutdown;
}
