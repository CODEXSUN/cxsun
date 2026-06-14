---
title: Queue Manager
---

# Queue Manager Module

Queue Manager exposes database and Redis queue runtime status.

## Responsibilities

- Show queue job stats and latest jobs.
- Retry, cancel, and delete jobs.
- Switch runtime mode where supported.
- Enqueue database backup jobs.

## Database

Queue jobs and runtime settings are stored in the master database when the database queue driver is active.
