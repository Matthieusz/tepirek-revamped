# Agent instructions

Use `pnpm check` to validate formatting and linting. Use `pnpm fix` when fixes are needed.

Linters do not validate business logic, naming, architecture, edge cases, accessibility, user experience, or documentation. Review those explicitly. Keep functions focused, name complex conditions, prefer early returns, separate unrelated concerns, and hoist reusable regular expressions.

### CodeGraph

This repository is indexed by CodeGraph through `.codegraph/`. Use it before grep, find, or broad source reads when locating code or tracing behavior:

- MCP: use `codegraph_explore` for symbols, source, and call paths, or `codegraph_node` for one symbol or file.
- Shell: use `codegraph explore "<question>"` or `codegraph node <symbol-or-file>`.

## Effect

Before writing Effect code, run `effect-solutions list`, then read the relevant guides with `effect-solutions show <topic>...`. Consult `~/.local/share/effect-solutions/effect` when the guides are insufficient. Never guess at Effect patterns.

## Repository workflows

- Issue operations: follow `docs/agents/issue-tracker.md`.
- Triage labels: follow `docs/agents/triage-labels.md`.
- Domain exploration: follow `docs/agents/domain.md`.
