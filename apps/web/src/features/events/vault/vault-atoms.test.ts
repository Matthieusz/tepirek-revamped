import { describe, expect, it } from "vitest";

import { oldestUnpaidEventAtom } from "@/features/events/ranking/ranking-atoms";
import {
  distributeGoldAtom,
  vaultAtom,
} from "@/features/events/vault/vault-atoms";
import {
  makeTestLayer,
  waitForAtomResults,
} from "@/lib/test-utils/atom-test-utils";

describe("vault atoms", () => {
  it("distributeGoldAtom with eventId refreshes vault and oldestUnpaidEvent", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    const mountedAtoms = [
      vaultAtom({ eventId: 5 }),
      vaultAtom({}),
      oldestUnpaidEventAtom,
    ] as const;
    registry.mount(mountedAtoms[0]);
    registry.mount(mountedAtoms[1]);
    registry.mount(mountedAtoms[2]);
    await waitForAtomResults(registry, mountedAtoms);

    const vaultCallCount = calls.filter((c) => c.method === "getVault").length;
    const oldestCallCount = calls.filter(
      (c) => c.method === "getOldestUnpaidEvent"
    ).length;

    registry.set(distributeGoldAtom, {
      eventId: 5,
      goldAmount: 500,
      heroId: 10,
    });
    await waitForAtomResults(registry, [distributeGoldAtom]);

    expect(calls.filter((c) => c.method === "getVault")).toHaveLength(
      vaultCallCount + 2
    );
    expect(
      calls.filter((c) => c.method === "getOldestUnpaidEvent")
    ).toHaveLength(oldestCallCount + 1);
  });
});
