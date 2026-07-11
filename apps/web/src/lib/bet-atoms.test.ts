import { describe, expect, it } from "vitest";

import { editBetAtom, paginatedBetsAtom } from "@/lib/bet-atoms";
import { flush, makeTestLayer } from "@/lib/test-utils/atom-test-utils";

describe("bet atoms", () => {
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
