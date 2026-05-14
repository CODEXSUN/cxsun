# Pull Request Template

## Summary

- <What this PR changes>
- <Why it matters>

## Changes

- <file>: <what changed and why>
- <file>: <what changed and why>

## Testing

- [ ] `npm -w apps/server run typecheck`
- [ ] `npm -w apps/frontend run typecheck`
- [ ] `npm -w packages/shared run typecheck`
- [ ] `npm -w packages/web run typecheck`
- [ ] `npm -w packages/desktop run typecheck`
- [ ] `npm -w packages/mobile run typecheck`
- [ ] `npm -w apps/server run build`
- [ ] `npm -w apps/frontend run build`
- [ ] Manual testing done, if user-facing behavior changed

## Notes

- Reserved packages should remain typecheckable even when minimal.
