# Server runtime ownership

Production uses Hono as the host adapter with one explicit Bun server and two scoped Effect web handlers: the application API and dependency-light health API. `src/index.ts` is the composition root and owns Better Auth, its PostgreSQL pool, both HttpApi handlers, and the Bun server.

Startup parses required configuration before accepting traffic. Startup failure disposes resources already acquired. `SIGINT` and `SIGTERM` first stop the Bun server gracefully and then await all Effect handler finalizers and PostgreSQL pool closure. Bun hot replacement uses `import.meta.hot.dispose` for the same teardown path. Shutdown is idempotent so overlapping triggers cannot run finalizers twice.
