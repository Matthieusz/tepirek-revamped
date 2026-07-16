import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";

export const withRequestCorrelation = <A, E, R>(
  request: HttpServerRequest,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  const requestId = request.headers["x-request-id"];

  if (requestId === undefined || requestId.length === 0) {
    return effect;
  }

  const annotated = effect.pipe(Effect.annotateSpans("request.id", requestId));

  return Effect.annotateCurrentSpan("request.id", requestId).pipe(
    Effect.andThen(annotated)
  );
};
