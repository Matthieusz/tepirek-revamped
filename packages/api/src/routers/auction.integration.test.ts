import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeApiLiveLayer } from "../effect-app.js";
import { AuctionStore } from "../modules/auction/auction-store.js";
import { createVerifiedMember } from "../test/integration/builders.js";
import { testDb } from "../test/integration/database.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}
const runStoreEffect = <A, E>(effect: Effect.Effect<A, E, AuctionStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(makeApiLiveLayer(databaseUrl))));
const runStoreExit = <A, E>(effect: Effect.Effect<A, E, AuctionStore>) =>
  Effect.runPromiseExit(
    effect.pipe(Effect.provide(makeApiLiveLayer(databaseUrl)))
  );

const paladinMainSlot = {
  column: 1,
  level: 30,
  profession: "paladin",
  round: 1,
  type: "main",
} as const;

describe("auction HttpApi store Postgres integration", () => {
  it("lets a verified member sign up for an available auction slot", async () => {
    const member = await createVerifiedMember({
      id: "auction-member",
      image: "https://example.com/avatar.png",
      name: "Auction Member",
    });
    await expect(
      runStoreEffect(
        AuctionStore.use((store) =>
          store.toggleSignup({ ...paladinMainSlot, actorUserId: member.id })
        )
      )
    ).resolves.toEqual({ action: "added" });
    await expect(
      runStoreEffect(
        AuctionStore.use((store) =>
          store.getSignups({ profession: "paladin", type: "main" })
        )
      )
    ).resolves.toMatchObject([
      {
        column: 1,
        level: 30,
        round: 1,
        userId: "auction-member",
        userImage: "https://example.com/avatar.png",
        userName: "Auction Member",
      },
    ]);
  });

  it("lets a verified member toggle their own auction signup off", async () => {
    const member = await createVerifiedMember({ id: "toggle-member" });
    await runStoreEffect(
      AuctionStore.use((store) =>
        store.toggleSignup({ ...paladinMainSlot, actorUserId: member.id })
      )
    );
    await expect(
      runStoreEffect(
        AuctionStore.use((store) =>
          store.toggleSignup({ ...paladinMainSlot, actorUserId: member.id })
        )
      )
    ).resolves.toEqual({ action: "removed" });
    await expect(
      runStoreEffect(
        AuctionStore.use((store) =>
          store.getSignups({ profession: "paladin", type: "main" })
        )
      )
    ).resolves.toEqual([]);
  });

  it("keeps auction signup working when the slot unique index is absent", async () => {
    const member = await createVerifiedMember({ id: "missing-index-member" });
    await testDb.execute(sql`drop index if exists auction_slot_unique_idx`);
    try {
      await expect(
        runStoreEffect(
          AuctionStore.use((store) =>
            store.toggleSignup({ ...paladinMainSlot, actorUserId: member.id })
          )
        )
      ).resolves.toEqual({ action: "added" });
    } finally {
      await testDb.execute(
        sql`create unique index if not exists auction_slot_unique_idx on auction_signups (profession, type, level, round, "column")`
      );
    }
  });

  it("prevents a second verified member from taking an occupied auction slot", async () => {
    const firstMember = await createVerifiedMember({ id: "first-member" });
    const secondMember = await createVerifiedMember({ id: "second-member" });
    await runStoreEffect(
      AuctionStore.use((store) =>
        store.toggleSignup({ ...paladinMainSlot, actorUserId: firstMember.id })
      )
    );
    await expect(
      runStoreExit(
        AuctionStore.use((store) =>
          store.toggleSignup({
            ...paladinMainSlot,
            actorUserId: secondMember.id,
          })
        )
      )
    ).resolves.toMatchObject({ _tag: "Failure" });
  });

  it("reports persisted auction signup totals and unique member counts", async () => {
    const firstMember = await createVerifiedMember({ id: "stats-member-one" });
    const secondMember = await createVerifiedMember({ id: "stats-member-two" });
    await runStoreEffect(
      AuctionStore.use((store) =>
        store.toggleSignup({ ...paladinMainSlot, actorUserId: firstMember.id })
      )
    );
    await runStoreEffect(
      AuctionStore.use((store) =>
        store.toggleSignup({
          ...paladinMainSlot,
          actorUserId: secondMember.id,
          column: 2,
        })
      )
    );
    await expect(
      runStoreEffect(
        AuctionStore.use((store) =>
          store.getStats({ profession: "paladin", type: "main" })
        )
      )
    ).resolves.toEqual({ totalSignups: 2, uniqueUsers: 2 });
  });
});
