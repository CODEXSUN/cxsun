# Sites App Module

Sites owns tenant public content and publishing workflows.

## Owns

- Pages
- Blog/content posts
- Menus
- SEO metadata
- Public publishing state
- Domain-bound public content lookup
- Landing page content blocks

## Does Not Own

- Billing invoices or payments
- Ecommerce checkout
- CRM pipelines
- Core auth/RBAC/session internals
- CXSync database maintenance

## Tenant Tables

Sites tables should use the `sites_` prefix.

Examples:

```text
sites_pages
sites_page_blocks
sites_posts
sites_menus
sites_menu_items
sites_seo_metadata
sites_publish_events
```

## Integration

Sites can display public content from Ecommerce or CRM only through public APIs or explicitly approved read models. It must not read private app tables directly.

