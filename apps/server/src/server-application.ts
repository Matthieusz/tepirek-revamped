import * as Context from "effect/Context";
import type { EvlogVariables } from "evlog/hono";
import type { Hono } from "hono";

/** Scoped Hono application value used by tests and the Bun host. */
export interface ServerApplicationService {
  readonly app: Hono<EvlogVariables>;
}

/** Scoped Hono application with its Effect HTTP handler runtimes alive. */
export class ServerApplication extends Context.Service<
  ServerApplication,
  ServerApplicationService
>()("@tepirek-revamped/server/ServerApplication") {}
