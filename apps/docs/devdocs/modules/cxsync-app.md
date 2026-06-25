# CXSync App Module

CXSync is a private database maintenance and safety system. It is not a tenant business app.

## Owns

- Tenant database audit
- Full-data clone preparation
- Migration rehearsal
- Controlled upgrade evidence
- Mirror/full-sync workflows
- Database diagnostics
- Safe dump and restore tooling

## Does Not Own

- Billing records
- Ecommerce orders
- CRM customer workflows
- Site content
- Tenant business settings beyond diagnostic access

## Persistence Boundary

CXSync may keep its own operational tables and evidence records. It must not add normal business tables to tenant app schemas.

## Safety Rules

- Keep CXSync deployment isolated from normal tenant business deployments.
- Do not run business module provisioning from CXSync maintenance startup.
- Any destructive or cutover operation must require an explicit separate approval path.
- Mirror and maintenance upgrade modes must remain visibly separate.

