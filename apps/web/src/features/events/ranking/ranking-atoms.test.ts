import { describe, expect, it } from "vitest";

import {
  heroStatsAtom,
  rankingAtom,
} from "@/features/events/ranking/ranking-atoms";
import {
  makeTestLayer,
  waitForAtomResults,
} from "@/lib/test-utils/atom-test-utils";

describe("ranking atoms", () => {
  it("omits undefined filters from the serialized ranking request", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();
    const ranking = rankingAtom({});

    registry.mount(ranking);
    await waitForAtomResults(registry, [ranking]);

    const request = calls.find((call) => call.method === "getRanking");
    expect(request?.args).toEqual({});
    expect(JSON.stringify(request?.args)).toBe("{}");
  });

  it("does not mount hero statistics resources for invalid hero IDs", () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(heroStatsAtom({ heroId: 0 }));
    registry.mount(heroStatsAtom({ heroId: -1 }));
    expect(calls).toHaveLength(0);
  });
});
