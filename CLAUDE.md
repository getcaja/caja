# Rules

- **NEVER run destructive git commands** (`git checkout -- <file>`, `git restore`, `git reset --hard`, `git clean`, `git stash drop`) without explicit user approval. These discard uncommitted work. Always use Edit tool to fix files instead.
- **Type-checking**: Use `npx tsc -b` (not `tsc --noEmit`) — this matches the build command (`tsc -b && vite build`) and uses project references (`tsconfig.app.json` + `tsconfig.node.json`).
- **Tests are mandatory**: Every bug fix or behavioral change MUST include a test that prevents regression. Run `npx vitest run` to verify all tests pass before finishing.
