# Security Rules

- Password hashing standard must be documented before auth implementation.
- Session/JWT expiry must be explicit.
- Permission checks must use a shared pattern.
- Route guards must be explicit.
- CORS must be configured.
- Rate limiting must be configured for auth and sensitive routes.
- Secure headers must be configured.
- Secrets must be loaded through typed config.
- Secrets must be redacted from logs.
- Admin bootstrap must be explicit and documented.
