# Platform API Modules

This folder contains Platform-owned modules for the standalone Platform API service.

Do not create deep folders for a single tiny file. Start simple, then split when the module grows.

Recommended first shape:

```text
<module>/
  <module>.module.ts
  <module>.module.md
  index.ts
```

When the module grows, split into:

```text
<module>/
  domain/
  application/
  infrastructure/
  interface/http/
  <module>.module.ts
  <module>.module.md
  index.ts
```

Every module must include `<module>.module.md` using `apps/platform-api/docs/MODULE-DOCS.md`.
