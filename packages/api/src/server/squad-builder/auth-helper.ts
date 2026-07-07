import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";

import type { AppUserId } from "../../domain/squad-builder/app-user-id.js";
import {
  SquadBuilderForbidden,
  SquadBuilderUnauthorized,
} from "../../protocol/squad-builder/squad-groups/http-api-contract.js";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

const headersFromRequest = (request: HttpServerRequest): Headers => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
};

/** Load the session from a request, or fail with 401/403. */
export const requireSquadBuilderSession = (
  request: HttpServerRequest
): Effect.Effect<
  NonNullable<Session>,
  SquadBuilderUnauthorized | SquadBuilderForbidden
> =>
  Effect.gen(function* requireSession() {
    const session = yield* Effect.promise(() =>
      auth.api.getSession({ headers: headersFromRequest(request) })
    );
    if (!session?.user) {
      return yield* new SquadBuilderUnauthorized({ message: "UNAUTHORIZED" });
    }
    if (session.user.verified !== true) {
      return yield* new SquadBuilderForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }
    return session;
  });

/** Extract the AppUserId from an authenticated session. */
export const sessionAppUserId = (session: NonNullable<Session>): AppUserId =>
  // SAFETY: The session user id was decoded from the auth token which is
  // trusted. The AppUserId schema validates the same string structure.
  session.user.id as AppUserId;
