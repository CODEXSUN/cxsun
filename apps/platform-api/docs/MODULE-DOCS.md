# Platform API Module Documentation Standard

Every Platform API module must carry local documentation from the start and publish user/client-facing guidance into the central docs app when the feature is visible to users.

## Two Documentation Layers

### Local Module Notes

Keep engineering memory beside the module:

```text
apps/platform-api/src/modules/<module>/
  <module>.module.md
```

Use local notes for:

- ownership and non-ownership
- routes/contracts
- database tables
- events
- queue jobs
- sync tags
- test commands
- migration/extraction notes from `apps/server`

### Central Docs

Put curated user/client documentation in:

```text
apps/docs/docs/<area>/<page>.md
```

Put developer/service documentation in:

```text
apps/docs/devdocs/modules/<module>.md
```

Central docs are the source users and support staff should read. Local module docs are the source developers maintain while implementing.

## Required Local Module Doc Template

Each module doc should include:

```md
# <Module Name>

## Owns

## Does Not Own

## API Contracts

## Tables

## Events

## Queue Jobs

## Sync Tags

## Tests

## Central Docs
```

If a section is not needed yet, write `None yet` instead of deleting the section.

## Centralization Rule

When a Platform API feature becomes visible to a tenant, admin, super-admin, or support user:

1. Keep/update the local module note.
2. Add or update the matching central docs page.
3. Link the central docs page in `apps/docs/sidebars.ts` or `apps/docs/sidebarsDev.ts`.
4. Run `npm -w apps/docs run build`.

## Stage Progress Rule

Update module documentation during the same stage as the implementation:

- New module: create `<module>.module.md`.
- New route or contract: update `API Contracts`.
- New table or schema ownership: update `Tables`.
- New event or queue job: update `Events` or `Queue Jobs`.
- New online/offline behavior: update `Sync Tags`.
- New tests or verification commands: update `Tests`.
- User-visible behavior: update the central docs app as well.

Do not leave module docs for a later cleanup pass.

## Client Docs Tone

Client docs should explain what the user can do and when to use it. Avoid internal code names, table names, queue names, and implementation detail unless the page is in `devdocs`.
