# Codexsun Docs

Docusaurus documentation app for Codexsun client user guides and developer/super-admin documentation.

## Scripts

- `npm -w apps/docs run start` serves client docs at `http://localhost:6020/docs/` and developer docs at `http://localhost:6020/devdocs/`.
- `npm -w apps/docs run build` builds the static docs site.
- `npm -w apps/docs run typecheck` validates Docusaurus TypeScript files.

## Integration

The super-admin frontend page `Dev Docs` calls the backend `api/system/devdocs/overview` endpoint to read the docs manifest and open this Docusaurus app.
