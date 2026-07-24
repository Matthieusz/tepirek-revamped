import { BetterAuthService } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as HttpHeaders from "effect/unstable/http/Headers";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";

import { parseAppUserId } from "../../domain/squad-builder/app-user-id.ts";
import {
  CurrentSession,
  InvalidSession,
  SessionMiddleware,
  SessionUnavailable,
} from "../../protocol/auth/http-api-middleware.ts";

const headersFromRequest = (
  request: HttpServerRequest.HttpServerRequest
): Headers =>
  new Headers(Schema.encodeSync(HttpHeaders.HeadersSchema)(request.headers));

/** Load and decode the request session through the Better Auth boundary. */
export const loadCurrentSession = Effect.fn("SessionMiddleware.loadSession")(
  function* loadCurrentSession(headers: Headers) {
    const auth = yield* BetterAuthService;
    const session = yield* auth
      .getSession(headers)
      .pipe(
        Effect.mapError(
          () => new SessionUnavailable({ message: "SESSION_UNAVAILABLE" })
        )
      );
    if (session === null) {
      return null;
    }
    const userId = yield* parseAppUserId(session.user.id).pipe(
      Effect.mapError(() => new InvalidSession({ message: "INVALID_SESSION" }))
    );
    const sessionUserId = yield* parseAppUserId(session.session.userId).pipe(
      Effect.mapError(() => new InvalidSession({ message: "INVALID_SESSION" }))
    );
    return {
      ...session,
      session: { ...session.session, userId: sessionUserId },
      user: { ...session.user, id: userId },
    };
  }
);

/** Session middleware implementation backed by the Better Auth service. */
export const SessionMiddlewareLayer = Layer.effect(
  SessionMiddleware,
  Effect.gen(function* makeSessionMiddleware() {
    const auth = yield* BetterAuthService;
    const loadRequestSession = Effect.fnUntraced(function* loadRequestSession<
      A,
      E,
      R,
    >(effect: Effect.Effect<A, E, R>) {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const currentSession = yield* loadCurrentSession(
        headersFromRequest(request)
      ).pipe(Effect.provideService(BetterAuthService, auth));
      return yield* effect.pipe(
        Effect.provideService(CurrentSession, currentSession)
      );
    });

    return SessionMiddleware.of(loadRequestSession);
  })
);
