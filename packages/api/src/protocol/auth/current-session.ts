import type { Auth } from "@tepirek-revamped/auth";
import * as Context from "effect/Context";

import type { AppUserId } from "../../domain/squad-builder/app-user-id.js";

type BetterAuthSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

export type RequestSession = Omit<BetterAuthSession, "user"> & {
  readonly user: Omit<BetterAuthSession["user"], "id"> & {
    readonly id: AppUserId;
  };
};

/** Request-scoped authenticated session, or null for anonymous requests. */
export class CurrentSession extends Context.Service<
  CurrentSession,
  RequestSession | null
>()("@tepirek-revamped/api/CurrentSession") {}
