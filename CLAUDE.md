# Rules

- **NEVER run destructive git commands** (`git checkout -- <file>`, `git restore`, `git reset --hard`, `git clean`, `git stash drop`) without explicit user approval. These discard uncommitted work. Always use Edit tool to fix files instead.
- **Type-checking**: Use `npx tsc -b` (not `tsc --noEmit`) — this matches the build command (`tsc -b && vite build`) and uses project references (`tsconfig.app.json` + `tsconfig.node.json`).
- **Tests are mandatory**: Every bug fix or behavioral change MUST include a test that prevents regression. Run `npx vitest run` to verify all tests pass before finishing.
- **UI styling — NO inline Tailwind spaghetti**: All recurring visual patterns (colors, states, buttons, pills, spacing) use semantic CSS classes defined in `src/index.css` (`c-dimmed`, `c-slot`, `c-icon-btn`, `c-pill`, etc.). NEVER scatter raw `fg-muted`, `fg-subtle`, `bg-inset` inline across components. To style a new element: check if a class exists → if not, create one in CSS first → then use the class. State toggles use `.is-active` (e.g., `c-dimmed ${active ? 'is-active' : ''}`), never inline ternaries with raw color classes.

# Release process

To publish a new release:

1. **Bump version** in both `package.json` AND `src-tauri/tauri.conf.json` — they MUST match.
2. **Commit** the version bump: `Bump to vX.Y.Z`
3. **Push** to main: `git push origin main`
4. **Tag** with the SAME version: `git tag vX.Y.Z && git push origin vX.Y.Z`

The GitHub Actions workflow triggers on tags matching `v*`. It creates a draft release named after the version in `tauri.conf.json`. If the tag and config version don't match, the re-sign step fails with "release not found".
