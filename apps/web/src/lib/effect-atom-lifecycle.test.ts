import { Effect, Latch } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { describe, expect, it } from "vitest";

const flushFibers = async () => {
  await Effect.runPromise(Effect.yieldNow);
  await Promise.resolve();
};

describe("Effect Atom lifecycle", () => {
  it("interrupts an in-flight mutation", async () => {
    const mutation = Atom.fn(() => Effect.never);
    const registry = AtomRegistry.make();
    const unmount = registry.mount(mutation);

    registry.set(mutation, undefined);
    expect(registry.get(mutation).waiting).toBe(true);

    registry.set(mutation, Atom.Interrupt);
    await flushFibers();

    expect(AsyncResult.isInterrupted(registry.get(mutation))).toBe(true);
    unmount();
  });

  it("prevents an interrupted stale response from replacing the latest result", async () => {
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
    await flushFibers();
    latches.get(1)?.openUnsafe();
    await flushFibers();

    const result = registry.get(mutation);
    expect(AsyncResult.isSuccess(result)).toBe(true);
    if (AsyncResult.isSuccess(result)) {
      expect(result.value).toBe(2);
    }
    unmount();
  });

  it("rolls an optimistic value back when its mutation fails", async () => {
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
    await flushFibers();

    expect(registry.get(optimistic)).toEqual([1, 2]);
    unmountRemove();
    unmountOptimistic();
  });

  it("runs finalizers when a mutation is replaced", async () => {
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
    await flushFibers();

    expect(finalizerRuns).toBe(1);
    unmount();
  });
});
