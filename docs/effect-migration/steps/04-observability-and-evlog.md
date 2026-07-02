# Step 04 — Observability and evlog

Status: draft; evlog replacement is explicitly not part of the first reference slice.

## Accepted strategy

Keep evlog during the first Effect migration, but make the oRPC/Effect bridge preserve evlog request correlation and log typed Effect failures with safe summaries. Replace evlog only after the reference module migration is stable.

## Current evlog responsibilities

- Hono middleware creates request-scoped logging through `c.get("log")`.
- Better-auth user context is attached to request logging through evlog integration.
- `packages/api` receives `context.logger` through oRPC context.
- Some router paths log typed failure summaries, such as squad-builder operation failures.
- Frontend/Nitro currently uses evlog error handling separately from the backend API server.

## Requirements for the Effect bridge

- Preserve established request correlation.
- Receive the current request/router context at the oRPC boundary.
- Log typed Effect failures through the existing request logger with safe fields:
  - operation name;
  - oRPC procedure path;
  - error `_tag`;
  - dependency name for adapter failures;
  - safe domain IDs where already refined and non-secret.
- Do not log arbitrary causes, raw request bodies, secrets, env values, or full domain objects.
- Keep domain modules independent of telemetry.

## Later replacement direction

After the reference module migration is stable, design a separate observability migration using:

- Effect `Logger`/`Tracer`;
- `Redacted` config and secret handling;
- safe error summary helpers;
- a Hono/request correlation replacement;
- a decision on whether frontend Nitro evlog should also be replaced.

## Guardrails

- New External Adapter Modules and error translators must preserve established logging/correlation behavior.
- Unknown thrown values and arbitrary payloads are not serialized for diagnostics.
- Secrets never enter errors, logs, traces, metrics, snapshots, or panic summaries.
