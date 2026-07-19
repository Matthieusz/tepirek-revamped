import { describe, expect, it } from "vitest";

import { oldestUnpaidEventAtom } from "@/features/events/ranking/ranking-atoms";
import {
  distributeGoldAtom,
  vaultAtom,
  userStatsAtom,
} from "@/features/events/vault/vault-atoms";
import { makeTestLayer, flush } from "@/lib/test-utils/atom-test-utils";

describe("vault atoms", () => {
  it("distributeGoldAtom with eventId refreshes vault, userStats, and oldestUnpaidEvent", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(vaultAtom({ eventId: 5 }));
    registry.mount(userStatsAtom({ eventId: 5 }));
    registry.mount(vaultAtom({}));
    registry.mount(userStatsAtom({}));
    registry.mount(oldestUnpaidEventAtom);
    await flush();

    const vaultCallCount = calls.filter((c) => c.method === "getVault").length;
    const userStatsCallCount = calls.filter(
      (c) => c.method === "getUserStats"
    ).length;
    const oldestCallCount = calls.filter(
      (c) => c.method === "getOldestUnpaidEvent"
    ).length;

    registry.set(distributeGoldAtom, {
      eventId: 5,
      goldAmount: 500,
      heroId: 10,
    });
    await flush();

    expect(calls.filter((c) => c.method === "getVault")).toHaveLength(
      vaultCallCount + 2
    );
    expect(calls.filter((c) => c.method === "getUserStats")).toHaveLength(
      userStatsCallCount + 2
    );
    expect(
      calls.filter((c) => c.method === "getOldestUnpaidEvent")
    ).toHaveLength(oldestCallCount + 1);
  });
});
