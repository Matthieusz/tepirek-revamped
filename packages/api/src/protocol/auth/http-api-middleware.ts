import { HttpApiMiddleware } from "effect/unstable/httpapi";

import type { CurrentSession } from "./current-session.js";
import { InvalidSession } from "./invalid-session.js";
import { SessionUnavailable } from "./session-unavailable.js";

export { CurrentSession } from "./current-session.js";
export { InvalidSession } from "./invalid-session.js";
export { SessionUnavailable } from "./session-unavailable.js";

/** Loads the Better Auth session once and provides it to endpoint handlers. */
export class SessionMiddleware extends HttpApiMiddleware.Service<
  SessionMiddleware,
  { provides: CurrentSession }
>()("@tepirek-revamped/api/SessionMiddleware", {
  error: [InvalidSession, SessionUnavailable],
}) {}
