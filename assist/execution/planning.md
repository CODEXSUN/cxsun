# Session Plan

**Date:** 2026-06-24
**Batch:** #128
**Focus:** Prepare CXSync as the all-tenant database audit, full-data clone, migration rehearsal, and controlled-upgrade system for live releases.

## Current Slice

1. Keep tenant billing backends responsible only for authenticated tenant schema snapshots.
2. Make CXSync Cloud the explicit owner of Desktop handshake and sync-audit report persistence.
3. Bind uploaded reports to the master tenant registry and make `(tenant, jobId)` retries idempotent.
4. Add a fast contract test and a live service-key-protected integration smoke harness.
5. Verify CXSync Cloud, Desktop/Electron, and server compilation.
6. Deploy CXSync maintenance through its isolated container and version-gated startup path without invoking the live application's database setup or tenant provisioner.

## Live Verification Gate

1. Start CXSync Cloud with the private service key.
2. Select one real tenant that exists in the master tenant registry.
3. Run the integration smoke for status, handshake, report upload, duplicate retry, and report listing.
4. Run the full Desktop schema workflow: snapshot, comparison, controlled drift, plan, restore-tested backup, approved repair, verification, and audit upload.
5. Build and install the Windows package on a clean workstation.
6. Commit and push release 1.0.128, deploy only `cxsync-maintenance`, verify ports 6078/6080, and confirm the live `cxsun` container was not restarted.

## Next Product Phase

Build fleet preparation in CXSync Cloud: inventory every active MariaDB tenant, create an auditable release batch, clone one canary with all data, run reviewed migrations against the candidate database, validate it, then prepare remaining tenants serially with stop-on-failure behavior. Do not add business-row synchronization to CXSync.

## Verification

- `npm -w apps/cxsync-cloud run test:contract`
- `npm -w apps/cxsync-cloud run typecheck`
- `npm -w apps/cxsync-cloud run build`
- `npm -w apps/cxsync run typecheck`
- `npm -w apps/cxsync run compile:electron`
- `npm -w apps/server run typecheck`
- Live only: `npm -w apps/cxsync-cloud run test:integration`
