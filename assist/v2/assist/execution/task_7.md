# TASK 7 - Start First App Backend And Frontend

Execute this task after Task 6 is complete.

Do not create business tables, business forms, or business workflows in this task.

## Objective

Start the first runnable app stack and prove backend, frontend, build, lifecycle, and tests are working before any business feature work begins.

The first app is:

```text
apps/platform/
|-- api/
`-- web/
```

## Required outcome

Task 7 is complete only when:

- Platform API starts.
- Platform web starts.
- Web calls API successfully.
- Health and readiness endpoints work.
- Backend handles shutdown safely.
- Frontend build passes.
- Backend build passes.
- Unit, contract, and e2e tests pass.
- No file exceeds 700 lines.

## Stage 1 - Platform API runtime

Create runnable API runtime.

- [ ] Add API entrypoint.
- [ ] Add typed config loading.
- [ ] Add port validation.
- [ ] Add request id middleware.
- [ ] Add structured logging.
- [ ] Add error handler.
- [ ] Add `/health`.
- [ ] Add `/ready`.
- [ ] Add 404 handler.
- [ ] Add startup log.
- [ ] Add runtime docs.

## Stage 2 - Strong lifecycle and shutdown

Server must not fail on process shutdown.

- [ ] Handle `SIGTERM`.
- [ ] Handle `SIGINT`.
- [ ] Handle uncaught exception.
- [ ] Handle unhandled rejection.
- [ ] Stop accepting new requests during shutdown.
- [ ] Close HTTP server gracefully.
- [ ] Close database/queue/sync connections if present.
- [ ] Force-exit only after shutdown timeout.
- [ ] Shutdown is idempotent.
- [ ] Shutdown logs reason and duration.
- [ ] Tests cover graceful close behavior.

## Stage 3 - Platform web runtime

Create runnable frontend.

- [ ] Add Vite React app.
- [ ] Add typed environment config.
- [ ] Add API base URL config.
- [ ] Add app shell.
- [ ] Add status page.
- [ ] Add loading state.
- [ ] Add error state.
- [ ] Add route fallback.
- [ ] Add web docs.

## Stage 4 - API client wiring

Wire frontend to backend.

- [ ] Add frontend API client.
- [ ] Add request id propagation where applicable.
- [ ] Add health client.
- [ ] Add readiness client.
- [ ] Add error normalization.
- [ ] Status page displays API health.
- [ ] Status page displays API readiness.
- [ ] API client uses typed contracts.

## Stage 5 - Local dev stack

Create one-command local start.

- [ ] Add `npm run dev:platform`.
- [ ] Add `npm run dev:platform:api`.
- [ ] Add `npm run dev:platform:web`.
- [ ] Add preflight port check.
- [ ] Add env check.
- [ ] Add clear failure message.
- [ ] Do not kill unrelated processes silently.
- [ ] Document local startup.

## Stage 6 - Backend tests

Create backend test suite.

- [ ] API unit tests.
- [ ] API contract tests.
- [ ] API e2e tests.
- [ ] `/health` test.
- [ ] `/ready` test.
- [ ] 404 test.
- [ ] error response test.
- [ ] request id test.
- [ ] SIGTERM graceful shutdown test.
- [ ] startup config validation test.

## Stage 7 - Frontend tests

Create frontend test suite.

- [ ] Web unit tests.
- [ ] API client tests.
- [ ] app shell render test.
- [ ] status page render test.
- [ ] loading state test.
- [ ] error state test.
- [ ] route fallback test.
- [ ] accessibility smoke test if tool is available.

## Stage 8 - End-to-end smoke

Create e2e smoke test.

- [ ] Start API.
- [ ] Start web.
- [ ] Open web.
- [ ] Verify status page loads.
- [ ] Verify web calls API health.
- [ ] Verify web calls API readiness.
- [ ] Verify clean shutdown after test.

## Stage 9 - Build verification

Build must pass independently.

- [ ] `npm run build:platform:api`
- [ ] `npm run build:platform:web`
- [ ] `npm run build:platform`
- [ ] Build output does not write generated files into `src/`.
- [ ] Build docs updated.

## Stage 10 - Root verification

Run:

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run test:contract`
- [ ] `npm run test:e2e`
- [ ] `npm run build`
- [ ] `npm run check`

## Stop conditions

Stop if:

- backend cannot shut down cleanly
- frontend cannot call backend
- tests require business data
- app needs business tables
- app needs business forms
- lifecycle errors are ignored
- build relies on another app internals
- file exceeds 700 lines

## Completion response

Report:

- API runtime created
- web runtime created
- API/web wiring completed
- lifecycle shutdown behavior
- test suites created
- e2e smoke result
- build commands run
- failed or skipped checks with reason
- whether first business app planning can start
