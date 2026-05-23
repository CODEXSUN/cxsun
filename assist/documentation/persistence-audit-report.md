# Persistence Audit Report

Date: 2026-05-22

Scope:
- Company master and child tables
- Contact master and child tables
- Product master and lookup ids
- Tenant database `aaran_db`
- Frontend-to-backend API persistence channels

## Result

Status: Passed after fixes.

The audit found that contact child collections existed in the frontend model but did not all have backend persistence channels. Contact address, communication, social, bank, and GST child persistence is now wired to tenant tables and hydrated back into list/show/edit responses.

Finalization pass:
- Contact `primary_email` and `primary_phone` are now always derived from the current communication rows during save, preventing stale primary values after edit.
- A second E2E smoke passed after this fix.

## Verified Channels

Company:
- `companies`
- `company_logos`
- `address_book` with `owner_type = company`
- `company_emails`
- `company_phones`
- `company_social_links`
- `company_bank_accounts`

Contact:
- `masters_contacts`
- `address_book` with `owner_type = contact`
- `contact_emails`
- `contact_phones`
- `contact_social_links`
- `contact_bank_accounts`
- `contact_gst_details`

Product:
- `masters_products`
- Lookup ids persisted for HSN code, unit, tax, and other product lookup columns.

Tenant common lookup tables checked:
- Contact: contact types, address types, bank names
- Location: countries, states, districts, cities, pincodes
- Product: groups, categories, types, HSN codes, brands, colours, sizes, units, taxes, styles

## E2E Smoke

API smoke was run against `http://localhost:6001` with tenant `aaran`.

Passed checks:
- Created and read back a contact with address, email, phone, social link, bank account, and GST detail.
- Verified contact derived `primary_email` and `primary_phone`.
- Created and read back a product with HSN, unit, and tax lookup ids.
- Created and read back a company with logo, address, email, phone, social link, and bank account.
- Temporary E2E records were removed from tenant tables after verification.

Verification commands:
- `npm -w apps/server run typecheck`
- `npm -w apps/frontend run typecheck`
- `npm run db:migrate -- --tenant=aaran`

Tenant database table check:
- All audited company, contact, product, order, and common lookup tables exist in `aaran_db`.

## Notes

Address default behavior:
- Missing contact address foreign ids are defaulted backend-side to the first active matching common record.
- Location defaults cascade as country -> state -> district -> city -> pincode.

Contact primary fields:
- `primary_email` and `primary_phone` are derived from the primary communication row, or the first row when no primary row is marked.

Hardcoded tenant-data cleanup:
- Removed tenant provisioner creation of hardcoded companies, company logos, company addresses, default contact, product template, and order placeholder rows.
- New company forms no longer prefill logo rows for persistence.
- Sales quick address country defaults now use the first country record returned from the database instead of a hardcoded country name.
- User/auth seed constants were intentionally left unchanged.
- Common/reference seeders remain in place because they populate database lookup tables used by autocomplete and foreign-key-like ids.
