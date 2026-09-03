# Server

The Node.js entry point for Tepirek Revamped. Hono hosts Better Auth and two Effect HTTP handlers: the application API and a dependency-light health API.

## Run locally

Complete the [repository setup](../../README.md#get-started), then run:

```bash
nub run dev:server
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

[`src/index.ts`](src/index.ts) parses startup configuration and launches one Effect server layer through `NodeRuntime.runMain`. The layer owns a single 10-connection PostgreSQL pool shared by the application and Better Auth Drizzle adapters, the Better Auth service, both Effect HTTP handlers, and the Node.js server.

`SIGINT` and `SIGTERM` interrupt the root Effect through the Node.js runtime. Scope closure then:

1. stops accepting requests and lets ordinary in-flight requests finish;
2. disposes both Effect handlers;
3. closes the shared PostgreSQL pool.

If a later startup stage fails, the scope releases every resource already acquired.

## Commands

```bash
nub run --filter server test        # lifecycle and configuration tests
nub run --filter server test:smoke  # startup and health checks
nub run --filter server build       # output dist/index.mjs
nub run --filter server start       # run the built server on Node.js
```

See the [Hono Node.js adapter](https://github.com/honojs/node-server) documentation for the host runtime and the [Effect HTTP API](https://effect.website/docs/unstable/httpapi/) documentation for the application handlers.
