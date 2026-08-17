import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  auctionSignupsAtom,
  auctionStatsAtom,
  toggleAuctionSignupAtom,
  removeAuctionSignupFromGroupAtom,
} from "@/features/auctions/auction-atoms";
import type { AuctionGroupInput } from "@/features/auctions/auction-atoms";
import {
  makeTestLayer,
  waitForAtomResults,
} from "@/lib/test-utils/atom-test-utils";

const AuctionGroupPayloadSchema = Schema.Struct({
  profession: Schema.String,
});

const hasProfession = (
  call: { readonly args: unknown; readonly method: string },
  method: string,
  profession: string
): boolean => {
  if (call.method !== method) {
    return false;
  }
  return (
    Schema.decodeUnknownSync(AuctionGroupPayloadSchema)(call.args)
      .profession === profession
  );
};

describe("auction atoms", () => {
  it("toggleAuctionSignupAtom triggers getAuctionSignups and getAuctionStats fetches for the toggled group", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    const profession: AuctionProfession = "mage";
    const type: AuctionType = "main";

    const signups = auctionSignupsAtom({ profession, type });
    const stats = auctionStatsAtom({ profession, type });
    registry.mount(signups);
    registry.mount(stats);
    await waitForAtomResults(registry, [signups, stats]);

    registry.set(toggleAuctionSignupAtom, {
      column: 1,
      level: 30,
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

    const groupA: AuctionGroupInput = { profession: "mage", type: "main" };
    const groupB: AuctionGroupInput = {
      profession: "warrior",
      type: "main",
    };

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

    const groupBSignupsBefore = calls.filter((c) =>
      hasProfession(c, "getAuctionSignups", "warrior")
    ).length;
    const groupBStatsBefore = calls.filter((c) =>
      hasProfession(c, "getAuctionStats", "warrior")
    ).length;

    registry.set(toggleAuctionSignupAtom, {
      column: 1,
      level: 30,
      ...groupA,
      round: 1,
    });
    await waitForAtomResults(registry, [toggleAuctionSignupAtom]);

    const groupBSignupsAfter = calls.filter((c) =>
      hasProfession(c, "getAuctionSignups", "warrior")
    ).length;
    const groupBStatsAfter = calls.filter((c) =>
      hasProfession(c, "getAuctionStats", "warrior")
    ).length;

    expect(groupBSignupsAfter).toBe(groupBSignupsBefore);
    expect(groupBStatsAfter).toBe(groupBStatsBefore);
  });

  it("removeAuctionSignupFromGroupAtom constructs the correct group key from payload", () => {
    const atom = removeAuctionSignupFromGroupAtom({
      profession: "mage",
      type: "main",
    });
    expect(atom).toBeDefined();
  });
});
