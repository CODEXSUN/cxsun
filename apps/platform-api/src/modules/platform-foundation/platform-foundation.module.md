# Platform Foundation Module

Owns the remaining shared Platform API contracts: RBAC, company/accounting-year context, app registry, service tokens, audit events, notification contracts, mail requests, file metadata, and durable queue processing.

This module stays business-neutral. It must not create Billing, Ecommerce, CRM, Sites, or CXSync business tables.

All persistence is MariaDB-backed. Service token verification is exposed as a contract endpoint for future service-to-service calls.
