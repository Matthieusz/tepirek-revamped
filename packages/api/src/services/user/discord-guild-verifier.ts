import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Redacted from "effect/Redacted";

import type { ApplicationDependencyUnavailable } from "../application-errors.ts";

/** Port used by the verification use case to query Discord membership. */
export class DiscordGuildVerifier extends Context.Service<
  DiscordGuildVerifier,
  {
    readonly verifyMembership: (
      accessToken: Redacted.Redacted
    ) => Effect.Effect<boolean, ApplicationDependencyUnavailable>;
  }
>()("@tepirek-revamped/api/user/DiscordGuildVerifier") {}
