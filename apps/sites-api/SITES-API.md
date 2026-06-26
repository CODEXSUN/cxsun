# Sites API

Sites API owns tenant public content delivery and public contact submissions.

Local development port: `6405`.

Public contracts:

- `GET /health`
- `GET /api/site`
- `GET /api/site/tenant-static?domain=<host>`
- `POST /api/site/contact`

It resolves tenant/domain context from the shared platform runtime but does not own Platform API or Billing API routes.
