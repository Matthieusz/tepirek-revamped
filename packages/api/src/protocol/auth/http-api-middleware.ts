import { HttpApiMiddleware } from "effect/unstable/httpapi";

import type { CurrentSession } from "./current-session.ts";
import { InvalidSession } from "./invalid-session.ts";
import { SessionUnavailable } from "./session-unavailable.ts";

export { CurrentSession } from "./current-session.ts";
export { InvalidSession } from "./invalid-session.ts";
export { SessionUnavailable } from "./session-unavailable.ts";

/** Loads the Better Auth session once and provides it to endpoint handlers. */
export class SessionMiddleware extends HttpApiMiddleware.Service<
  SessionMiddleware,
  { provides: CurrentSession }
>()("@tepirek-revamped/api/SessionMiddleware", {
  error: [InvalidSession, SessionUnavailable],
}) {}
