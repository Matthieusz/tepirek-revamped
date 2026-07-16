import { describe, expect, it } from "vitest";

import { heroStatsAtom } from "@/lib/ranking-atoms";
import { flush, makeTestLayer } from "@/lib/test-utils/atom-test-utils";

describe("ranking atoms", () => {
  it("does not mount hero statistics resources for invalid hero IDs", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(heroStatsAtom({ heroId: 0 }));
    registry.mount(heroStatsAtom({ heroId: -1 }));
    await flush();

    expect(calls).toHaveLength(0);
  });
});
