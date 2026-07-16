import { describe, expect, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Tracer from "effect/Tracer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";

import { withRequestCorrelation } from "./request-correlation.ts";

const makeRequest = (requestId?: string) =>
  HttpServerRequest.fromWeb(
    new Request(
      "http://localhost:3000/squad-builder",
      requestId === undefined
        ? undefined
        : { headers: { "x-request-id": requestId } }
    )
  );

const makeTracer = () => {
  const spans: Tracer.NativeSpan[] = [];
  const tracer = Tracer.make({
    span(options) {
      const span = new Tracer.NativeSpan(options);
      spans.push(span);
      return span;
    },
  });

  return { spans, tracer };
};

describe("withRequestCorrelation", () => {
  it.effect("annotates the active and child spans on success", () => {
    const { spans, tracer } = makeTracer();

    return Effect.gen(function* requestCorrelationSuccessEffect() {
      const result = yield* Effect.withSpan(
        withRequestCorrelation(
          makeRequest("request-123"),
          Effect.withSpan(Effect.succeed("success"), "child")
        ),
        "handler"
      );
      yield* Effect.yieldNow;

      expect(result).toBe("success");
      expect(
        spans
          .find((span) => span.name === "handler")
          ?.attributes.get("request.id")
      ).toBe("request-123");
      expect(
        spans
          .find((span) => span.name === "child")
          ?.attributes.get("request.id")
      ).toBe("request-123");
    }).pipe(Effect.provideService(Tracer.Tracer, tracer));
  });

  it.effect("annotates the active span when the wrapped effect fails", () => {
    const { spans, tracer } = makeTracer();

    return Effect.gen(function* requestCorrelationFailureEffect() {
      const exit = yield* Effect.exit(
        Effect.withSpan(
          withRequestCorrelation(
            makeRequest("request-456"),
            Effect.fail("expected failure")
          ),
          "handler"
        )
      );
      yield* Effect.yieldNow;

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const [reason] = exit.cause.reasons;
        expect(reason).toBeDefined();
        if (reason !== undefined) {
          expect(Cause.isFailReason(reason) && reason.error).toBe(
            "expected failure"
          );
        }
      }
      expect(
        spans
          .find((span) => span.name === "handler")
          ?.attributes.get("request.id")
      ).toBe("request-456");
    }).pipe(Effect.provideService(Tracer.Tracer, tracer));
  });

  it.effect("leaves effects and spans unchanged without a request ID", () => {
    const { spans, tracer } = makeTracer();

    return Effect.gen(function* requestCorrelationNoIdEffect() {
      const success = yield* Effect.withSpan(
        withRequestCorrelation(makeRequest(), Effect.succeed("success")),
        "handler"
      );
      const emptyRequestIdExit = yield* Effect.exit(
        Effect.withSpan(
          withRequestCorrelation(
            makeRequest(""),
            Effect.fail("expected failure")
          ),
          "empty-request-id-handler"
        )
      );
      yield* Effect.yieldNow;

      expect(success).toBe("success");
      expect(Exit.isFailure(emptyRequestIdExit)).toBe(true);
      if (Exit.isFailure(emptyRequestIdExit)) {
        const [reason] = emptyRequestIdExit.cause.reasons;
        expect(reason).toBeDefined();
        if (reason !== undefined) {
          expect(Cause.isFailReason(reason) && reason.error).toBe(
            "expected failure"
          );
        }
      }
      expect(
        spans
          .find((span) => span.name === "handler")
          ?.attributes.has("request.id")
      ).toBe(false);
      expect(
        spans
          .find((span) => span.name === "empty-request-id-handler")
          ?.attributes.has("request.id")
      ).toBe(false);
    }).pipe(Effect.provideService(Tracer.Tracer, tracer));
  });
});
