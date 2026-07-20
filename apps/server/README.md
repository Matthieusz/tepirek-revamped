# Server

The Bun entry point for Tepirek Revamped. Hono hosts Better Auth and two Effect HTTP handlers: the application API and a dependency-light health API.

## Run locally

Complete the [repository setup](../../README.md#local-setup), then run:

```bash
pnpm dev:server
```

The server listens on <http://localhost:3000> by default.

| Route                   | Purpose                                |
| ----------------------- | -------------------------------------- |
| `GET /`                 | Basic process response                 |
| `GET /health`           | Health API                             |
| `GET /api/openapi.json` | Generated application OpenAPI document |
| `GET, POST /api/auth/*` | Better Auth endpoints                  |

Application routes include announcements, tasks, heroes, events, skills, auctions, bets, rankings, users, the vault, and squad building.

## Configuration

Copy [`.env.example`](.env.example) to `.env`. Startup validates database, auth, CORS, Discord, and Firecrawl settings before accepting traffic. OpenTelemetry export and server logging are optional and documented in the example file.

Do not commit `.env`. Rotate credentials if they appear in logs, screenshots, issues, or chat.

## Runtime ownership

[`src/index.ts`](src/index.ts) is the composition root. It creates the PostgreSQL pool, Better Auth instance, Effect handlers, and Bun server.

On `SIGINT`, `SIGTERM`, or Bun hot-module disposal, shutdown follows one idempotent path:

1. stop accepting requests;
2. dispose both Effect handlers;
3. close the PostgreSQL pool.

If startup fails, resources already acquired are released.

## Commands

```bash
pnpm --filter server test        # lifecycle and configuration tests
pnpm --filter server test:smoke  # startup and health checks
pnpm --filter server build       # output dist/index.mjs
pnpm --filter server start       # run the built server
pnpm --filter server compile     # produce a standalone Bun executable
```

See the [Hono](https://hono.dev/docs/) and [Bun server](https://bun.sh/docs/api/http) documentation for the host runtime, and the [Effect HTTP API](https://effect.website/docs/unstable/httpapi/) documentation for the application handlers.
