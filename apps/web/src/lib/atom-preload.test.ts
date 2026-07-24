import { describe, expect, it, vi } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";

import { preloadAtomResults } from "@/lib/atom-preload";

describe("preloadAtomResults", () => {
  it("starts independent resources in parallel", async () => {
    const release = Deferred.makeUnsafe<boolean>();
    const started: string[] = [];
    const makeResource = (name: string) =>
      Atom.make(
        Effect.sync(() => {
          started.push(name);
        }).pipe(Effect.andThen(Deferred.await(release)), Effect.as(name))
      );
    const first = makeResource("first");
    const second = makeResource("second");
    const registry = AtomRegistry.make();

    const preload = preloadAtomResults(registry, [first, second]);
    await vi.waitFor(() => {
      expect(started).toHaveLength(2);
    });

    expect(started).toEqual(["first", "second"]);
    Effect.runSync(Deferred.succeed(release, true));
    await preload;
  });

  it("cancels sibling resources when one fails", async () => {
    const siblingStarted = Deferred.makeUnsafe<boolean>();
    let siblingInterrupted = false;
    const sibling = Atom.make(
      Effect.sync(() => {
        Effect.runSync(Deferred.succeed(siblingStarted, true));
      }).pipe(
        Effect.andThen(Effect.never),
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            siblingInterrupted = true;
          })
        )
      )
    );
    const failing = Atom.make(
      Deferred.await(siblingStarted).pipe(
        Effect.andThen(Effect.fail("load failed"))
      )
    );
    const registry = AtomRegistry.make();

    await expect(
      preloadAtomResults(registry, [failing, sibling])
    ).rejects.toThrow("load failed");
    await vi.waitFor(() => {
      expect(siblingInterrupted).toBe(true);
    });
  });

  it("reuses fresh successful values without duplicate requests", async () => {
    let requests = 0;
    const resource = Atom.make(
      Effect.sync(() => {
        requests += 1;
        return requests;
      })
    );
    const registry = AtomRegistry.make({ defaultIdleTTL: 400 });

    await preloadAtomResults(registry, [resource]);
    await preloadAtomResults(registry, [resource]);

    expect(requests).toBe(1);
  });

  it("surfaces failures and refreshes them on retry", async () => {
    const firstRequestRelease = Deferred.makeUnsafe<boolean>();
    let requests = 0;
    const resource = Atom.make(
      Effect.suspend(() => {
        requests += 1;
        return requests === 1
          ? Deferred.await(firstRequestRelease).pipe(
              Effect.andThen(Effect.fail("load failed"))
            )
          : Effect.succeed("loaded");
      })
    );
    const registry = AtomRegistry.make({ defaultIdleTTL: 400 });

    const firstPreload = preloadAtomResults(registry, [resource]);
    Effect.runSync(Deferred.succeed(firstRequestRelease, true));
    await expect(firstPreload).rejects.toThrow("load failed");
    await preloadAtomResults(registry, [resource]);

    expect(requests).toBe(2);
  });

  it("keeps request state isolated between registries", async () => {
    let requests = 0;
    const resource = Atom.make(
      Effect.sync(() => {
        requests += 1;
        return requests;
      })
    );
    const firstRequestRegistry = AtomRegistry.make();
    const secondRequestRegistry = AtomRegistry.make();

    await Promise.all([
      preloadAtomResults(firstRequestRegistry, [resource]),
      preloadAtomResults(secondRequestRegistry, [resource]),
    ]);

    expect(requests).toBe(2);
    expect(firstRequestRegistry.get(resource)).not.toBe(
      secondRequestRegistry.get(resource)
    );
  });
});
