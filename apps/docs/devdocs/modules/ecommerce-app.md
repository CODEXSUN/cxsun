# Ecommerce App Module

Ecommerce owns online selling workflows. It should not become a billing or accounting module.

## Owns

- Storefront catalog presentation
- Product/category display metadata for online sale
- Carts
- Checkout
- Ecommerce orders
- Customer order status
- Payment gateway checkout handoff
- Invoice request after confirmed order

## Does Not Own

- Billing invoices
- Billing document numbering
- Receipts and accounting allocation
- CRM pipelines
- Site builder pages outside storefront needs
- Core auth/RBAC/mail internals

## Tenant Tables

Ecommerce tables should use the `ecommerce_` prefix.

Examples:

```text
ecommerce_storefront_products
ecommerce_categories
ecommerce_carts
ecommerce_cart_items
ecommerce_orders
ecommerce_order_items
ecommerce_payment_attempts
ecommerce_order_invoice_links
```

## Integration

When an order is confirmed, Ecommerce asks Billing to create the invoice. Ecommerce stores only the returned billing reference and status.

