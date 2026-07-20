import { describe, expect, it } from "vitest";

import {
  deleteBetAtom,
  editBetAtom,
  paginatedBetsAtom,
} from "@/features/events/bets/bet-atoms";
import {
  makeTestLayer,
  waitForAtomResults,
} from "@/lib/test-utils/atom-test-utils";

describe("bet atoms", () => {
  it("deletes a bet and refreshes the active first page", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();
    const refreshInput = { eventId: 5, heroId: 2, limit: 10, page: 1 };

    const paginatedBets = paginatedBetsAtom(refreshInput);
    registry.mount(paginatedBets);
    await waitForAtomResults(registry, [paginatedBets]);
    const callsBefore = calls.filter(
      (call) => call.method === "getAllPaginated"
    ).length;

    registry.set(deleteBetAtom, { id: 10, refreshInput });
    await waitForAtomResults(registry, [deleteBetAtom]);

    expect(calls.filter((call) => call.method === "delete")).toHaveLength(1);
    expect(
      calls.filter((call) => call.method === "getAllPaginated")
    ).toHaveLength(callsBefore + 1);
    expect(calls.find((call) => call.method === "delete")?.args).toEqual({
      id: 10,
    });
  });

  it("refreshes mounted paginated queries after editing a bet", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    const paginatedBets = paginatedBetsAtom({ eventId: 5, page: 1 });
    registry.mount(paginatedBets);
    await waitForAtomResults(registry, [paginatedBets]);
    const callsBefore = calls.filter(
      (call) => call.method === "getAllPaginated"
    ).length;

    registry.set(editBetAtom, {
      betId: 10,
      newUserIds: ["user-id"],
      refreshInput: { eventId: 5, page: 1 },
    });
    await waitForAtomResults(registry, [editBetAtom]);

    expect(
      calls.filter((call) => call.method === "getAllPaginated")
    ).toHaveLength(callsBefore + 1);
  });
});
