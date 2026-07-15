import { describe, expect, it } from "@effect/vitest";
import { Effect, Latch } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";

const flushFibers = Effect.gen(function* flushEffectFibers() {
  yield* Effect.yieldNow;
  yield* Effect.promise(() => Promise.resolve());
});

describe("Effect Atom lifecycle", () => {
  it.effect("interrupts an in-flight mutation", () =>
    Effect.gen(function* interruptMutation() {
      const mutation = Atom.fn(() => Effect.never);
      const registry = AtomRegistry.make();
      const unmount = registry.mount(mutation);

      registry.set(mutation, undefined);
      expect(registry.get(mutation).waiting).toBe(true);

      registry.set(mutation, Atom.Interrupt);
      yield* flushFibers;

      expect(AsyncResult.isInterrupted(registry.get(mutation))).toBe(true);
      unmount();
    })
  );

  it.effect(
    "prevents an interrupted stale response from replacing the latest result",
    () =>
      Effect.gen(function* preventStaleResponse() {
        const latches = new Map<number, Latch.Latch>();
        const mutation = Atom.fn((value: number) => {
          const latch = Latch.makeUnsafe();
          latches.set(value, latch);
          return latch.await.pipe(Effect.as(value));
        });
        const registry = AtomRegistry.make();
        const unmount = registry.mount(mutation);

        registry.set(mutation, 1);
        registry.set(mutation, 2);
        latches.get(2)?.openUnsafe();
        yield* flushFibers;
        latches.get(1)?.openUnsafe();
        yield* flushFibers;

        const result = registry.get(mutation);
        expect(AsyncResult.isSuccess(result)).toBe(true);
        if (AsyncResult.isSuccess(result)) {
          expect(result.value).toBe(2);
        }
        unmount();
      })
  );

  it.effect("rolls an optimistic value back when its mutation fails", () =>
    Effect.gen(function* rollbackOptimisticValue() {
      const source = Atom.make([1, 2]);
      const optimistic = Atom.optimistic(source);
      const remove = optimistic.pipe(
        Atom.optimisticFn({
          fn: Atom.fn((_removed: number) => Effect.fail("rejected")),
          reducer: (values, removed: number) =>
            values.filter((value) => value !== removed),
        })
      );
      const registry = AtomRegistry.make();
      const unmountOptimistic = registry.mount(optimistic);
      const unmountRemove = registry.mount(remove);

      registry.set(remove, 1);
      yield* flushFibers;

      expect(registry.get(optimistic)).toEqual([1, 2]);
      unmountRemove();
      unmountOptimistic();
    })
  );

  it.effect("runs finalizers when a mutation is replaced", () =>
    Effect.gen(function* runReplacementFinalizers() {
      let finalizerRuns = 0;
      const mutation = Atom.fn((value: number) =>
        Effect.acquireRelease(Effect.succeed(value), () =>
          Effect.sync(() => {
            finalizerRuns += 1;
          })
        ).pipe(Effect.andThen(Effect.never))
      );
      const registry = AtomRegistry.make();
      const unmount = registry.mount(mutation);

      registry.set(mutation, 1);
      registry.set(mutation, 2);
      yield* flushFibers;

      expect(finalizerRuns).toBe(1);
      unmount();
    })
  );
});
