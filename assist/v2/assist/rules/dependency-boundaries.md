# Dependency Boundary Rules

Allowed:

```text
apps/* -> framework
apps/* -> packages/*
packages/testing -> framework
packages/testing -> packages/contracts
packages/ui -> packages/contracts
```

Forbidden:

```text
framework -> apps/*
framework -> Platform behavior
packages/* -> apps/*
packages/contracts -> implementation code
apps/* -> another app private code
```

`npm run check:deps` must fail on forbidden imports.

## Cross-app usage

If one app needs another app capability:

- use the target app public API, or
- publish/consume an event, or
- publish/consume a queue job, or
- use a sync message contract.

Do not share private services, repositories, modules, or database tables across apps.
