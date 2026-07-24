# ADR 0001: Share one PostgreSQL pool between Drizzle adapters

## Status

Accepted

## Context

The application persistence code uses Drizzle's Effect PostgreSQL driver, while Better Auth requires Drizzle's node-postgres driver. The server previously let each path create its own PostgreSQL pool, doubling baseline connection capacity and splitting acquisition and shutdown policy.

Replacing Hono or either adapter is outside the lifecycle migration. The two drivers also cannot share a transaction context even when they use the same underlying pool.

## Decision

The server acquires one scoped `pg.Pool`, limited to 10 connections, before constructing either database adapter. The database package derives both the Effect Drizzle database and Better Auth's node-postgres Drizzle database from that pool. Effect scope closure owns pool shutdown.

The adapters share connection capacity and resource lifetime only. A transaction opened through one adapter is not visible to the other, and application code must not imply cross-adapter atomicity.

Hono remains the HTTP host. Its Effect handler runtimes and Bun server are scoped resources above the shared pool, so shutdown stops the Bun server, disposes handlers, and then closes PostgreSQL.

## Consequences

- Database capacity is explicit and is no longer accidentally doubled.
- Better Auth and application persistence have one acquisition and shutdown policy.
- Finalizer ordering is represented by Effect layer dependencies.
- Cross-adapter transactions remain unsupported and must be designed as separate operations.
- The server intentionally retains Hono and `HttpRouter.toWebHandler` rather than adopting Effect's Bun HTTP server.
