import { describe, expect, it } from "vitest";

import { deleteBetAtom, editBetAtom, paginatedBetsAtom } from "@/lib/bet-atoms";
import { flush, makeTestLayer } from "@/lib/test-utils/atom-test-utils";

describe("bet atoms", () => {
  it("deletes a bet and refreshes the active first page", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();
    const refreshInput = { eventId: 5, heroId: 2, limit: 10, page: 1 };

    registry.mount(paginatedBetsAtom(refreshInput));
    await flush();
    const callsBefore = calls.filter(
      (call) => call.method === "getAllPaginated"
    ).length;

    registry.set(deleteBetAtom, { id: 10, refreshInput });
    await flush();

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

    registry.mount(paginatedBetsAtom({ eventId: 5, page: 1 }));
    await flush();
    const callsBefore = calls.filter(
      (call) => call.method === "getAllPaginated"
    ).length;

    registry.set(editBetAtom, {
      betId: 10,
      newUserIds: ["user-id"],
      refreshInput: { eventId: 5, page: 1 },
    });
    await flush();

    expect(
      calls.filter((call) => call.method === "getAllPaginated")
    ).toHaveLength(callsBefore + 1);
  });
});
