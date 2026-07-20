import { describe, expect, it } from "vitest";

import { heroStatsAtom } from "@/features/events/ranking/ranking-atoms";
import { makeTestLayer } from "@/lib/test-utils/atom-test-utils";

describe("ranking atoms", () => {
  it("does not mount hero statistics resources for invalid hero IDs", () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(heroStatsAtom({ heroId: 0 }));
    registry.mount(heroStatsAtom({ heroId: -1 }));
    expect(calls).toHaveLength(0);
  });
});
