# Agent instructions

Use `nub run check` to validate formatting and linting. Use `nub run fix` when fixes are needed.

Linters do not validate business logic, naming, architecture, edge cases, accessibility, user experience, or documentation. Review those explicitly. Keep functions focused, name complex conditions, prefer early returns, separate unrelated concerns, and hoist reusable regular expressions.

## Effect

Before writing Effect code, run `effect-solutions list`, then read the relevant guides with `effect-solutions show <topic>...`. Consult `~/.local/share/effect-solutions/effect` when the guides are insufficient. Never guess at Effect patterns.

## Repository workflows

- Issue operations: follow `docs/agents/issue-tracker.md`.
- Triage labels: follow `docs/agents/triage-labels.md`.
- Domain exploration: follow `docs/agents/domain.md`.
