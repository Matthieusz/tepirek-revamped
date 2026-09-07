import { Effect } from "effect";
import {
  Atom,
  AtomRegistry as AtomRegistryModule,
} from "effect/unstable/reactivity";
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { getResult } from "effect/unstable/reactivity/AtomRegistry";

import { appHttpApiRuntime } from "@/lib/atom-http-api-runtime";
import type { preloadAtomResults } from "@/lib/atom-preload";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";

/**
 * Creates the legacy Atom test fixture over the shared HttpApi transport.
 *
 * The registry remains local to the fixture. Query tests can use the same
 * transport without constructing or depending on an Atom registry.
 */
type HttpApiTestLayer = ReturnType<typeof makeHttpApiTestLayer>;
type AtomTestLayer = HttpApiTestLayer & {
  readonly makeRegistry: () => AtomRegistry.AtomRegistry;
};

export const makeTestLayer = (): AtomTestLayer => {
  const { calls, layer } = makeHttpApiTestLayer();

  return {
    calls,
    layer,
    makeRegistry: () =>
      AtomRegistryModule.make({
        initialValues: [Atom.initialValue(appHttpApiRuntime.layer, layer)],
      }),
  };
};

type AsyncResultAtom = Parameters<typeof preloadAtomResults>[1][number];

/** Waits until every supplied atom has reached a non-waiting result. */
export const waitForAtomResults = async (
  registry: AtomRegistry.AtomRegistry,
  atoms: readonly AsyncResultAtom[]
): Promise<void> => {
  await Promise.all(
    atoms.map(
      async (atom) =>
        await Effect.runPromise(
          getResult(registry, atom, { suspendOnWaiting: true })
        )
    )
  );
};
