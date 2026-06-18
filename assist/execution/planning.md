# Session Plan

**Date:** 2026-06-18
**Focus:** Separate TConnect connector from the Tirupur Connect marketplace.

## Objective

Record the corrected bounded-system architecture in the rulebook and AI documentation, audit the mixed implementation, and prepare a safe phased implementation plan without changing runtime behavior.

## Current Slice

1. Make the connector/marketplace rule canonical.
2. Mark conflicting older TConnect plans as superseded.
3. Document ownership, identity, persistence, routes, publication revisions, and admin separation.
4. Audit the existing `modules/tconnect` implementation for reusable connector code and marketplace code to migrate.
5. Prepare a non-destructive implementation and data-migration order.

## Verification

- Review changed Markdown for contradictory ownership statements.
- Confirm no application source or database migration behavior changed in this documentation-only slice.
