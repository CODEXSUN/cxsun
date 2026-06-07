# SETTINGS

## Summary
Software settings management for company configuration including letterhead, feature toggles, printing defaults, document numbering, and GST/contact defaults.

## What We Done
- Settings page with tabs: Letterhead, Features, Printing, Document Numbering, GST & Contact
- Letterhead editor (company name, address, logo, signature, bank details)
- Feature toggles UI for enabling/disabling modules
- Printing defaults (paper size, margins, page orientation)
- Document numbering settings (prefix, suffix, starting number per document type)
- Settings state management via software settings types and defaults
- Persistence layer (localStorage cache + server sync via company-settings-client)
- React hook (useCompanySoftwareSettings) for loading/saving with loading state
- Generic company settings API client (fetch/save any JSON settings object)

## Gaps
- No user-level settings (only company-level)
- No role-based access control for settings
- No settings audit log (who changed what)
- No email/SMS configuration
- No payment gateway configuration
- No tax regime configuration (GST composition, etc.)
- No multicurrency default settings
- No warehouse/godown configuration here (might be separate)

## Future Concepts
- User profile and preference settings
- Role & permissions management
- Email/SMS gateway setup with templates
- Payment gateway integration settings
- Tax configuration (GST composition, rate updates)
- Multicurrency and exchange rate settings
- System-wide defaults (fiscal year, date format)
- Settings import/export for backup
