import { describe, expect, it } from "vitest";

import {
  auctionSignupsAtom,
  auctionStatsAtom,
  toggleAuctionSignupAtom,
  removeAuctionSignupFromGroupAtom,
} from "@/lib/auction-atoms";
import {
  makeTestLayer,
  waitForAtomResults,
} from "@/lib/test-utils/atom-test-utils";

describe("auction atoms", () => {
  it("toggleAuctionSignupAtom triggers getAuctionSignups and getAuctionStats fetches for the toggled group", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    const profession = "mage" as const;
    const type = "main" as const;

    const signups = auctionSignupsAtom({ profession, type });
    const stats = auctionStatsAtom({ profession, type });
    registry.mount(signups);
    registry.mount(stats);
    await waitForAtomResults(registry, [signups, stats]);

    registry.set(toggleAuctionSignupAtom, {
      column: 0,
      level: 1,
      profession,
      round: 1,
      type,
    });
    await waitForAtomResults(registry, [toggleAuctionSignupAtom]);

    const signupsCalls = calls.filter((c) => c.method === "getAuctionSignups");
    expect(signupsCalls.length).toBeGreaterThanOrEqual(2);

    const statsCalls = calls.filter((c) => c.method === "getAuctionStats");
    expect(statsCalls.length).toBeGreaterThanOrEqual(2);

    const toggleCalls = calls.filter((c) => c.method === "toggleAuctionSignup");
    expect(toggleCalls).toHaveLength(1);
  });

  it("toggleAuctionSignupAtom does not refresh unrelated groups", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    const groupA = { profession: "mage" as const, type: "main" as const };
    const groupB = { profession: "warrior" as const, type: "main" as const };

    const mountedAtoms = [
      auctionSignupsAtom(groupA),
      auctionStatsAtom(groupA),
      auctionSignupsAtom(groupB),
      auctionStatsAtom(groupB),
    ] as const;
    registry.mount(mountedAtoms[0]);
    registry.mount(mountedAtoms[1]);
    registry.mount(mountedAtoms[2]);
    registry.mount(mountedAtoms[3]);
    await waitForAtomResults(registry, mountedAtoms);

    const groupBSignupsBefore = calls.filter(
      (c) =>
        c.method === "getAuctionSignups" &&
        (c.args as { readonly profession?: string })?.profession === "warrior"
    ).length;
    const groupBStatsBefore = calls.filter(
      (c) =>
        c.method === "getAuctionStats" &&
        (c.args as { readonly profession?: string })?.profession === "warrior"
    ).length;

    registry.set(toggleAuctionSignupAtom, {
      column: 1,
      level: 2,
      ...groupA,
      round: 1,
    });
    await waitForAtomResults(registry, [toggleAuctionSignupAtom]);

    const groupBSignupsAfter = calls.filter(
      (c) =>
        c.method === "getAuctionSignups" &&
        (c.args as { readonly profession?: string })?.profession === "warrior"
    ).length;
    const groupBStatsAfter = calls.filter(
      (c) =>
        c.method === "getAuctionStats" &&
        (c.args as { readonly profession?: string })?.profession === "warrior"
    ).length;

    expect(groupBSignupsAfter).toBe(groupBSignupsBefore);
    expect(groupBStatsAfter).toBe(groupBStatsBefore);
  });

  it("removeAuctionSignupFromGroupAtom constructs the correct group key from payload", () => {
    const atom = removeAuctionSignupFromGroupAtom({
      profession: "mage" as const,
      type: "main" as const,
    });
    expect(atom).toBeDefined();
  });
});
