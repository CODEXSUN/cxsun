# Scope Control Rules

These rules prevent overthinking, overcoding, and uncontrolled file growth.

## File size limit

- No source or markdown file should exceed 700 lines.
- If a file reaches 600 lines, plan a split before adding more content.
- If a file must exceed 700 lines temporarily, stop and ask for approval.
- Generated files are exempt only when they are clearly generated and not hand-maintained.

## Task boundary

- Implement only the active task.
- Do not implement future task behavior early.
- Do not create business tables during foundation tasks.
- Do not create business forms during foundation tasks.
- Do not create app-specific modules during foundation tasks.
- If a request expands scope, update execution docs first or stop for confirmation.

## Thinking boundary

- Do not redesign completed standards without a specific request.
- Do not add abstractions without immediate use.
- Do not add packages without immediate use.
- Do not create speculative folders beyond the approved structure.
- Prefer direct, boring, typed implementation.

## Split rule

Split files by responsibility:

- routes
- service/use case
- repository/adapter
- contracts
- tests
- documentation

Never hide multiple module responsibilities in one large file.
