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

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
