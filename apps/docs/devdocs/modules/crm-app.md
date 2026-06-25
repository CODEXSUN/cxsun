# CRM App Module

CRM owns customer relationship workflows, not invoicing or ecommerce checkout.

## Owns

- Leads
- Pipelines
- Follow-ups
- CRM tasks
- Customer activity timeline
- Notes and reminders
- Opportunity tracking

## Does Not Own

- Billing invoice records
- Ecommerce cart/order records
- Public site pages
- Core auth/RBAC/mail internals

## Tenant Tables

CRM tables should use the `crm_` prefix.

Examples:

```text
crm_leads
crm_pipeline_stages
crm_opportunities
crm_followups
crm_tasks
crm_notes
crm_activity_events
```

## Integration

CRM may link to Core contacts and may request Billing quotations or invoices through Billing APIs. It must not directly write Billing tables.

