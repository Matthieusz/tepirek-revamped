import { Effect } from "effect";
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type * as Atom from "effect/unstable/reactivity/Atom";
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { getResult, mount } from "effect/unstable/reactivity/AtomRegistry";

type AsyncResultAtom = Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>>;

/**
 * Resolves route-critical resource atoms in one registry.
 *
 * All atoms are mounted before any result is awaited, so independent effects
 * start concurrently. Successful cached values are reused. A cached failure is
 * refreshed, which lets a retried route load perform a fresh request.
 */
export const preloadAtomResults = async (
  registry: AtomRegistry.AtomRegistry,
  atoms: readonly AsyncResultAtom[]
): Promise<void> => {
  for (const atom of atoms) {
    if (registry.get(atom)._tag === "Failure") {
      registry.refresh(atom);
    }
  }

  const preload = Effect.gen(function* preloadAtomResultsEffect() {
    yield* Effect.all(
      atoms.map((atom) => mount(registry, atom)),
      { discard: true }
    );
    yield* Effect.all(
      atoms.map((atom) =>
        getResult(registry, atom, { suspendOnWaiting: true })
      ),
      { concurrency: "unbounded", discard: true }
    );
  });

  await Effect.runPromise(Effect.scoped(preload));
};
