# MAIL

## Summary
Provides outbound email capabilities with SMTP configuration, message composition, queuing, and delivery tracking. Supports HTML/text email composition with attachments, draft saving, and asynchronous delivery via a queue worker.

## What We Done
- SMTP mail settings management (provider, host, port, auth, from/reply-to) per company
- Email composition with to/cc/bcc, subject, HTML and text body, and attachments (base64 or file path)
- Draft saving and queue-based async sending
- Message status tracking (draft, queued, sending, sent, failed)
- Message-level activity events (drafted, queued, sent, failed)
- Attachment metadata storage and retrieval
- Mail dispatcher worker that connects to SMTP using nodemailer and sends queued emails
- Temporary file attachment storage and cleanup after delivery
- Default mail settings from global application config
- Password masking in settings API response

## Gaps
- No inbound email receiving/processing
- No email templates or template variables
- No scheduled/delayed sending
- No email open/click tracking
- No bounce handling or delivery status webhooks
- No email threading or conversation view
- No batch/bulk send with recipient merging

## Future Concepts
- Email template management with dynamic variable substitution
- Inbound email processing via IMAP or webhook
- Scheduled email sending with timezone support
- Open/click tracking via embedded pixels
- Bounce and complaint handling with SES/SparkPost integration
- Email analytics dashboard (delivery rates, engagement)
- Email threading and conversation history per entity
