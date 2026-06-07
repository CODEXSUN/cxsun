# MEDIA

## Summary
Asset management system for uploading, storing, serving, and organizing files with public/private visibility, sharing, and record linking capabilities. Supports images, documents, SVG logos, and general file storage with disk-based storage and queue event publishing.

## What We Done
- File upload with base64 content, auto-detected mime types, and SHA-256 checksum
- Public and private storage with separate disk paths
- File metadata management (tags, captions, alt text, folder organization)
- File serving with proper Content-Type, Content-Disposition, and caching headers
- Public storage content serving via `/storage/:tenant/:visibility/:folder/:fileName`
- Asset sharing with expiring tokens and share URLs
- Asset linking to business records (module, record ID, purpose)
- Company logo upload (logo.svg, logo-dark.svg, favicon.svg) with SVG-only validation and auto-replacement
- Soft-delete with activity logging (uploaded, updated, deleted, shared, linked, replaced)
- Queue events published for asset lifecycle (uploaded, updated, deleted, shared, linked)
- Anonymous public read support via tenant slug query parameter

## Gaps
- No image resizing or thumbnailing
- No video/audio streaming support
- No CDN integration for public assets
- No file type validation beyond SVG logo check
- No chunked upload for large files
- No storage usage quotas per tenant
- No bulk upload/download operations
- No direct external URL import

## Future Concepts
- Image transformation pipeline (resize, crop, format conversion) with on-the-fly URLs
- CDN integration for public/private asset distribution
- Storage quota enforcement and usage reporting
- Chunked/multipart upload with resume support
- Asset versioning and revision history
- OCR for document images
- Video transcoding and streaming support
- Drag-and-drop upload with progress indication
- Integration with task manager for attachment storage
