export { AuthConfig, AuthConfigLiveLayer } from "./auth-config.ts";

export type { AuthEnv } from "./auth-config.ts";

export { createAuth } from "./better-auth-instance.ts";

export {
  BetterAuthService,
  BetterAuthUnavailable,
  buildBetterAuthService,
  buildBetterAuthServiceLayer,
} from "./better-auth-service.ts";

export type { BetterAuthServiceInterface } from "./better-auth-service.ts";

export type {
  BetterAuthInstance,
  BetterAuthSession,
} from "./better-auth-types.ts";

export {
  BetterAuthInitializationError,
  BetterAuthServiceLiveLayer,
} from "./live.ts";
