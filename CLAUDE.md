# Rules

- **NEVER run destructive git commands** (`git checkout -- <file>`, `git restore`, `git reset --hard`, `git clean`, `git stash drop`) without explicit user approval. These discard uncommitted work. Always use Edit tool to fix files instead.
- **Type-checking**: Use `npx tsc -b` (not `tsc --noEmit`) — this matches the build command (`tsc -b && vite build`) and uses project references (`tsconfig.app.json` + `tsconfig.node.json`).
- **Tests are mandatory**: Every bug fix or behavioral change MUST include a test that prevents regression. Run `npx vitest run` to verify all tests pass before finishing.
- **UI styling — NO inline Tailwind spaghetti**: All recurring visual patterns (colors, states, buttons, pills, spacing) use semantic CSS classes defined in `src/index.css` (`c-dimmed`, `c-slot`, `c-icon-btn`, `c-pill`, etc.). NEVER scatter raw `fg-muted`, `fg-subtle`, `bg-inset` inline across components. To style a new element: check if a class exists → if not, create one in CSS first → then use the class. State toggles use `.is-active` (e.g., `c-dimmed ${active ? 'is-active' : ''}`), never inline ternaries with raw color classes.
