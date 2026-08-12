/* eslint-disable max-classes-per-file -- Collocated live construction error schema. */
import { BetterAuthDatabaseService } from "@tepirek-revamped/db/effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { AuthConfig } from "./auth-config.ts";
import { createAuth } from "./better-auth-instance.ts";
import {
  BetterAuthService,
  makeBetterAuthService,
} from "./better-auth-service.ts";
import type { BetterAuthInstance } from "./better-auth-types.ts";

export { AuthConfig, AuthConfigLiveLayer } from "./auth-config.ts";
export type { AuthEnv } from "./auth-config.ts";
export { createAuth } from "./better-auth-instance.ts";
export type {
  BetterAuthInstance,
  BetterAuthSession,
} from "./better-auth-types.ts";
export {
  BetterAuthService,
  BetterAuthUnavailable,
  makeBetterAuthService,
} from "./better-auth-service.ts";
export type { BetterAuthServiceInterface } from "./better-auth-service.ts";

/** Expected startup failure when Better Auth construction rejects its inputs. */
export class BetterAuthInitializationError extends Schema.TaggedErrorClass<BetterAuthInitializationError>()(
  "BetterAuthInitializationError",
  { cause: Schema.Defect() }
) {}

/** Construct Better Auth from validated config and the shared database adapter. */
export const BetterAuthServiceLiveLayer = Layer.effect(
  BetterAuthService,
  Effect.gen(function* makeLiveBetterAuthService() {
    const config = yield* AuthConfig;
    const database = yield* BetterAuthDatabaseService;
    const instance = yield* Effect.try({
      catch: (cause) => new BetterAuthInitializationError({ cause }),
      try: () => createAuth(config, database),
    });
    return makeBetterAuthService(instance);
  })
);

/** Construct a Better Auth service layer around a supplied vendor instance. */
export const makeBetterAuthServiceLayer = (
  instance: BetterAuthInstance
): Layer.Layer<BetterAuthService> =>
  Layer.succeed(BetterAuthService, makeBetterAuthService(instance));
