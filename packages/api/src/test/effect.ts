import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import { TestClock, TestConsole } from "effect/testing";

const TestServicesLive = Layer.mergeAll(TestClock.layer(), TestConsole.layer);

const logFailure = <A, E>(exit: Exit.Exit<A, E>) => {
  if (Exit.isFailure(exit)) {
    for (const error of Cause.prettyErrors(exit.cause)) {
      console.error(error);
    }
  }
};

const runWithFreshScope = <R, E, A, E2>(
  layer: Layer.Layer<R, E>,
  body: Effect.Effect<A, E2, R | Scope.Scope>
): Promise<A> => {
  const program = Effect.gen(function* runTestEffect() {
    const scope = yield* Scope.make();
    const memoMap = Layer.makeMemoMapUnsafe();
    const contextExit = yield* Effect.exit(
      Layer.buildWithMemoMap(layer, memoMap, scope)
    );

    if (Exit.isFailure(contextExit)) {
      logFailure(contextExit);
      yield* Scope.close(scope, contextExit);
      return yield* Effect.failCause(contextExit.cause);
    }

    const bodyExit = yield* Effect.exit(
      body.pipe(Effect.provide(contextExit.value), Scope.provide(scope))
    );

    logFailure(bodyExit);
    yield* Scope.close(scope, bodyExit);

    if (Exit.isFailure(bodyExit)) {
      return yield* Effect.failCause(bodyExit.cause);
    }

    return bodyExit.value;
  });

  return Effect.runPromise(program);
};

export const testEffect = <R, E, A, E2>(
  layer: Layer.Layer<R, E>,
  body: Effect.Effect<A, E2, R | Scope.Scope>
): Promise<A> =>
  runWithFreshScope(Layer.mergeAll(TestServicesLive, layer), body);

export const liveEffect = <R, E, A, E2>(
  layer: Layer.Layer<R, E>,
  body: Effect.Effect<A, E2, R | Scope.Scope>
): Promise<A> => runWithFreshScope(layer, body);
