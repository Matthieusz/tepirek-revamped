import { Effect } from "effect";
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type * as Atom from "effect/unstable/reactivity/Atom";
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { getResult } from "effect/unstable/reactivity/AtomRegistry";

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
    const cachedResult = registry.getNodes().get(atom)?.value();
    if (cachedResult?._tag === "Failure") {
      registry.refresh(atom);
    }
  }

  const unmount = atoms.map((atom) => registry.mount(atom));

  try {
    await Promise.all(
      atoms.map((atom) =>
        Effect.runPromise(getResult(registry, atom, { suspendOnWaiting: true }))
      )
    );
  } finally {
    for (const release of unmount) {
      release();
    }
  }
};
