# Platform API

Platform API is the first backend extraction from the current combined `apps/server` runtime.

## Naming

Use **Platform API** for the deployable service name.

Use **core** for internal framework/foundation code.

Reason:

- `core` is clear for engineers inside the codebase.
- `platform-api` is clearer as a container, process, log name, and deployment unit.
- Business apps such as Billing, Ecommerce, CRM, and Sites can depend on Platform API without confusing it with their own internal core folders.

## Current Scope

This scaffold starts narrow and imports existing transition-backend modules from `apps/server`.

Included first:

- Health
- Auth
- Tenant records
- Tenant domains
- Industry records

Not included yet:

- Billing entries
- Ecommerce
- CRM
- Sites
- CXSync
- Tirupur Connect marketplace
- Tenant business provisioning startup
- Queue workers

## Transition Rule

Do not remove these modules from `apps/server` yet. The combined backend remains the live compatibility runtime until Platform API and Billing API are both proven.

The first goal is separate startup and verification, not behavior migration.

## Standards

Read these before adding Platform API behavior:

- `apps/platform-api/docs/STANDARDS.md`
- `apps/platform-api/docs/CONTRACTS.md`
- `apps/platform-api/docs/EXTRACTION.md`
