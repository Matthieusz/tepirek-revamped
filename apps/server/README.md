# Server

The Node.js entry point for Tepirek Revamped. Effect's native Node HTTP server serves one router containing the application API, Better Auth, public process response, health API, and OpenAPI document.

## Run locally

Complete the [repository setup](../../README.md#get-started), then run:

```bash
pnpm dev:server
```

The server listens on <http://localhost:3000> by default.

| Route                   | Purpose                                |
| ----------------------- | -------------------------------------- |
| `GET /`                 | Basic process response                 |
| `GET /health`           | Health API                             |
| `GET /api/openapi.json` | Generated application OpenAPI document |
| `* /api/auth/*`         | Better Auth endpoints                  |

Application routes include announcements, tasks, heroes, events, skills, auctions, bets, rankings, users, the vault, and squad building.

## Configuration

Copy [`.env.example`](.env.example) to `.env`. Startup validates database, auth, CORS, Discord, and Firecrawl settings before accepting traffic. OpenTelemetry export and server logging are optional and documented in the example file.

Do not commit `.env`. Rotate credentials if they appear in logs, screenshots, issues, or chat.

## Authentication

Better Auth endpoints are mounted by [`BetterAuthHttpRoutes`](../../packages/api/src/server/auth/http-routes.ts) using the [official Effect integration](https://better-auth.com/docs/integrations/effect): `HttpRouter.add("*", "/api/auth/*", HttpEffect.fromWebHandler(auth.handler))`. Better Auth owns endpoint validation, redirects, cookies, and auth responses; there is no separate framework auth handler.

The auth package separates vendor configuration (`better-auth-instance.ts`), the typed session boundary (`better-auth-service.ts`), and live dependency construction (`live.ts`). Its root is an export-only barrel. Application session middleware retains ID parsing and safe typed failures; authorization remains application policy.

CORS is applied once by Effect middleware before routing. Only the configured frontend origin receives credentialed CORS access. The same parsed frontend origin is supplied to Better Auth's `trustedOrigins`. Production cookie settings and Discord hooks remain in the vendor configuration.

## HTTP observability

[`src/http-application.ts`](src/http-application.ts) uses [evlog's Effect integration](https://www.evlog.dev/integrate/frameworks/effect): `routerLayer` emits one redacted wide event per routed request and `initLoggerLayer` owns initialization and drain flushing. Effect's separate `Sent HTTP response` logger is not enabled. CORS preflights short-circuit before routing and do not emit route events.

The middleware replaces client-supplied request IDs with secure UUIDs, provides the ID to handlers and spans, and returns it in `x-request-id`, including on errors and preflights. Session middleware adds only the parsed user ID to the event, without another session lookup or logging email, cookies, or tokens. Existing Effect application logging and OTLP tracing remain configured through the observability layer.

The server and API pin evlog to `2.34.0` because its Effect integration is beta; review its changelog before upgrading.

## Runtime ownership

[`src/index.ts`](src/index.ts) parses startup configuration and launches one Effect server layer through `NodeRuntime.runMain`. The layer owns a single 10-connection PostgreSQL pool shared by the application and Better Auth Drizzle adapters, the Better Auth service, the acquired router, and the native Node.js server.

`SIGINT` and `SIGTERM` interrupt the root Effect through the Node.js runtime. Scope closure then:

1. stops accepting requests and lets ordinary in-flight requests finish (with the Node adapter's default 20-second grace period before request interruption);
2. releases the router and application dependencies;
3. closes the shared PostgreSQL pool and finalizes logging.

If a later startup stage fails, the scope releases every resource already acquired.

## Commands

```bash
pnpm --filter server test        # HTTP boundary, lifecycle, and configuration tests
pnpm --filter server test:smoke  # startup and health checks
pnpm --filter server build       # output dist/index.mjs
pnpm --filter server start       # run the built server on Node.js
```

See the [Effect HTTP platform](https://effect.website/docs/v4/platform/introduction) documentation for the native host and the [Better Auth Effect integration](https://better-auth.com/docs/integrations/effect) for authentication routing.
