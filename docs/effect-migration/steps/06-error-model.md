# Step 06 — Error Model

Status: draft.

## Accepted strategy

Convert local expected failures to precise `Schema.TaggedErrorClass` errors, keep broad HTTP/RPC error mapping only at the oRPC boundary, and wrap unknown adapter failures with safe structured persistence/dependency errors.

## First-slice examples

For `createSquadGroup`:

- `InvalidSquadGroupName` becomes an Effect Schema tagged error.
- Persistence failure becomes a tagged error such as `SquadBuilderPersistenceUnavailable` with safe fields:
  - `operation: "createSquadGroup"`;
  - `provider: "postgres"`;
  - safe unknown cause wrapping such as `Schema.Defect` where appropriate.
- The local service/module error union remains precise:
  - `InvalidSquadGroupName | SquadBuilderPersistenceUnavailable`.

## oRPC boundary mapping

At the oRPC boundary:

- `InvalidSquadGroupName` maps to `ORPCError("BAD_REQUEST", { message })`.
- `SquadBuilderPersistenceUnavailable` maps to `ORPCError("INTERNAL_SERVER_ERROR")`.
- The bridge logs a safe summary through evlog:
  - procedure path;
  - operation;
  - error `_tag`;
  - dependency/provider if present;
  - safe domain IDs when available.

## Guardrails

- Expected failures stay in Effect's typed error channel.
- Domain parse failures, authorization denials, not-found outcomes, persistence unavailability, and workflow failures are not defects.
- Broad `AppError`-style unions stay near orchestration/rendering/entrypoints only.
- Unknown thrown values are classified by External Adapter Modules before translation.
- Unknown causes are not exposed to clients and are not serialized into logs.
- Startup config failures may be defects but must still avoid secrets and unsafe raw values in diagnostics.
