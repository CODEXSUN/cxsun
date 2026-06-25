# Billing App Module

Billing is the tenant app for creating bills, sending documents, collecting payments, and reporting tax/business totals.

## Owns

- Domestic sales invoices
- Export sales invoices
- Quotations and proforma invoices
- Receipts and payment allocation
- Credit notes and debit notes
- Billing document numbering
- Billing PDF templates
- Invoice email handoff through Core Mail
- Billing reports and GST/tax summaries

## Does Not Own

- Ecommerce cart or checkout
- CRM lead pipeline
- Website pages or blog content
- Platform user/session ownership
- CXSync database maintenance

## Tenant Tables

Billing tables should use the `billing_` prefix for new work.

Examples:

```text
billing_sales_invoices
billing_sales_invoice_items
billing_export_invoices
billing_quotations
billing_receipts
billing_credit_notes
billing_document_numbers
billing_pdf_jobs
```

Existing live entry tables should be migrated only through a planned compatibility step.

## Integration

Ecommerce may request invoice creation, but Billing creates and owns the invoice.

```text
ecommerce order confirmed
  -> billing create invoice command
  -> billing creates invoice/PDF/email job
  -> ecommerce stores invoice reference
```

