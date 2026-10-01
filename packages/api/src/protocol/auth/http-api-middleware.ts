/* eslint-disable max-classes-per-file -- Collocated middleware error schemas. */
import { HttpApiMiddleware } from "effect/http-api";
import * as Schema from "effect/Schema";

import type { CurrentSession } from "./current-session.ts";

export { CurrentSession } from "./current-session.ts";

/** Safe response for malformed authenticated session data. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidSession extends Schema.TaggedError<InvalidSession>()(
  "InvalidSession",
  { message: Schema.Literal("INVALID_SESSION") },
  { httpApiStatus: 401 }
) {}

/** Safe public projection for session-store failures. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SessionUnavailable extends Schema.TaggedError<SessionUnavailable>()(
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
