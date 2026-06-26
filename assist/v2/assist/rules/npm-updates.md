# NPM Update Rules

- No blind `npm update`.
- No broad major upgrades without decision record.
- Add a dependency only when used by the current task.
- Remove unused dependencies in the same task.
- Commit lockfile with dependency changes.
- Dependency changes require typecheck, tests, and build.
- Security updates must be documented.
