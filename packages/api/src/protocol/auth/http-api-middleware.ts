/* eslint-disable max-classes-per-file -- Collocated middleware error schemas. */
import * as Schema from "effect/Schema";
import { HttpApiMiddleware } from "effect/unstable/httpapi";

import type { CurrentSession } from "./current-session.ts";

export { CurrentSession } from "./current-session.ts";

/** Safe response for malformed authenticated session data. */
export class InvalidSession extends Schema.TaggedErrorClass<InvalidSession>()(
  "InvalidSession",
  { message: Schema.Literal("INVALID_SESSION") },
  { httpApiStatus: 401 }
) {}

/** Safe public projection for session-store failures. */
export class SessionUnavailable extends Schema.TaggedErrorClass<SessionUnavailable>()(
  "SessionUnavailable",
  { message: Schema.Literal("SESSION_UNAVAILABLE") },
  { httpApiStatus: 503 }
) {}

/** Loads the Better Auth session once and provides it to endpoint handlers. */
export class SessionMiddleware extends HttpApiMiddleware.Service<
  SessionMiddleware,
  { provides: CurrentSession }
>()("@tepirek-revamped/api/SessionMiddleware", {
  error: [InvalidSession, SessionUnavailable],
}) {}
