# Database Rules

- No business tables during foundation tasks.
- Migration folders must exist before module tables are added.
- Seeder folders must exist before seed data is added.
- Migrations must be named consistently.
- Seeders must be idempotent.
- Deployed migrations use forward-fix policy.
- Timestamp, audit, public id, index, and foreign key naming standards must be documented before business schemas.
- Tenant and organization isolation rules must be documented before data tables.
