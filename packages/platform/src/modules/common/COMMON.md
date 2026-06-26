# COMMON

## Summary
A collection of reference/master data modules shared across the application, providing standardized lookup tables for location data (countries, states, districts, cities, pincodes), contact metadata (groups, types, address types, bank names), product metadata (groups, categories, types, units, HSN codes, taxes, brands, colours, sizes, styles), order metadata (order types, transports, warehouses, destinations, stock rejection types), and other business reference data (currencies, priorities, payment terms, accounting years, months).

## What We Done
- 29 master data submodules with consistent definition-based architecture
- Location records: countries, states, districts, and cities retain their hierarchy; Pincodes are independent seeded records containing only the Pincode value and active state.
- Contact reference: contact groups (seeded), contact types (seeded), address types (seeded), bank names (seeded)
- Product reference: product groups (seeded), product categories (seeded), product types (seeded), units (seeded), HSN codes (seeded), taxes (seeded), brands (seeded), colours (seeded), sizes (seeded), styles (seeded)
- Order reference: order types (seeded), transports (seeded), warehouses (seeded), destinations (seeded), stock rejection types (seeded)
- Business reference: currencies (seeded), priorities (seeded), payment terms (seeded), accounting years, months (seeded)
- Module registry with definitions and folder contracts for dynamic module loading
- Unified migration and seed orchestration via `migrateCommonModuleTables` and `seedCommonModuleTables`
- All modules are based on the `master-record` foundation module pattern with standardized controller/service/repository layers

## Gaps
- Some submodules lack dedicated CRUD APIs (relying on generic master-record endpoints)
- No reference data versioning or change tracking
- No bulk import/export of lookup data
- No tenant-specific overrides for global reference data
- No active/inactive toggle for some submodules
- No search/autocomplete endpoints for individual submodules

## Future Concepts
- Centralized reference data management UI
- Tenant-specific overrides for global master data
- Bulk CSV/Excel import for master data
- Reference data dependency mapping (e.g., which products use which HSN codes)
- Versioned reference data with effective dates
- API endpoints with search, pagination, and filtering for each submodule
- Integration with GST API for HSN code updates
- Multi-language support for reference data labels
