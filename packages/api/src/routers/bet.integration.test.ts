import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import {
  createAdmin,
  createHero,
  createUnverifiedUser,
  createVerifiedMember,
} from "../test/integration/builders.js";
import { createAuthenticatedRouterClient } from "../test/integration/router-client.js";

describe("bet router Postgres integration", () => {
  it("lets an admin create a hero bet and verified members read persisted members", async () => {
    const admin = await createAdmin({ id: "bet-admin", name: "Bet Admin" });
    const firstMember = await createVerifiedMember({
      id: "bet-member-one",
      image: "https://example.com/member-one.png",
      name: "Bet Member One",
    });
    const secondMember = await createVerifiedMember({
      id: "bet-member-two",
      name: "Bet Member Two",
    });
    const hero = await createHero({ name: "Mroczny Patryk" });
    const adminClient = createAuthenticatedRouterClient(admin);
    const memberClient = createAuthenticatedRouterClient(firstMember);

    const createdBet = await adminClient.bet.create({
      heroId: hero.id,
      userIds: [firstMember.id, secondMember.id],
    });

    await expect(memberClient.bet.getAll()).resolves.toMatchObject([
      {
        createdBy: admin.id,
        createdByName: "Bet Admin",
        heroId: hero.id,
        heroName: "Mroczny Patryk",
        id: createdBet.id,
        memberCount: 2,
        members: expect.arrayContaining([
          expect.objectContaining({
            points: "10.00",
            userId: firstMember.id,
            userImage: "https://example.com/member-one.png",
            userName: "Bet Member One",
          }),
          expect.objectContaining({
            points: "10.00",
            userId: secondMember.id,
            userName: "Bet Member Two",
          }),
        ]),
      },
    ]);
  });

  it("updates member points and stats when an admin edits a bet", async () => {
    const admin = await createAdmin({ id: "edit-bet-admin" });
    const firstMember = await createVerifiedMember({ id: "edit-member-one" });
    const secondMember = await createVerifiedMember({ id: "edit-member-two" });
    const thirdMember = await createVerifiedMember({ id: "edit-member-three" });
    const hero = await createHero({ name: "Edytowany Heros" });
    const client = createAuthenticatedRouterClient(admin);

    const createdBet = await client.bet.create({
      heroId: hero.id,
      userIds: [firstMember.id, secondMember.id],
    });

    await expect(
      client.bet.edit({
        betId: createdBet.id,
        newUserIds: [firstMember.id, thirdMember.id],
      })
    ).resolves.toEqual({ success: true });

    await expect(
      client.bet.getBetMembers({ betId: createdBet.id })
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ points: "10.00", userId: firstMember.id }),
        expect.objectContaining({ points: "10.00", userId: thirdMember.id }),
      ])
    );

    await expect(
      client.vault.getUserStats({ eventId: hero.eventId })
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bets: 1,
          points: "10.00",
          userId: firstMember.id,
        }),
        expect.objectContaining({
          bets: 1,
          points: "10.00",
          userId: thirdMember.id,
        }),
      ])
    );
  });

  it("prevents verified non-admin members from creating bets", async () => {
    const member = await createVerifiedMember({ id: "bet-non-admin" });
    const hero = await createHero({ name: "Protected Bet Hero" });
    const client = createAuthenticatedRouterClient(member);

    await expect(
      client.bet.create({ heroId: hero.id, userIds: [member.id] })
    ).rejects.toBeInstanceOf(ORPCError);

    await expect(client.bet.getAll()).resolves.toEqual([]);
  });

  it("returns only the latest bet for the copy-last-bet helper", async () => {
    const admin = await createAdmin({ id: "latest-bet-admin" });
    const firstMember = await createVerifiedMember({ id: "latest-bet-one" });
    const secondMember = await createVerifiedMember({ id: "latest-bet-two" });
    const thirdMember = await createVerifiedMember({ id: "latest-bet-three" });
    const hero = await createHero({ name: "Latest Bet Hero" });
    const client = createAuthenticatedRouterClient(admin);

    await expect(client.bet.getLatestForCopy()).resolves.toBeNull();

    await client.bet.create({
      heroId: hero.id,
      userIds: [firstMember.id],
    });
    await client.bet.create({
      heroId: hero.id,
      userIds: [secondMember.id, thirdMember.id],
    });

    const latest = await client.bet.getLatestForCopy();

    expect(latest).not.toBeNull();
    expect(latest?.members.map((member) => member.userId).toSorted()).toEqual(
      [secondMember.id, thirdMember.id].toSorted()
    );
  });

  it("rejects duplicate members when creating a hero bet", async () => {
    const admin = await createAdmin({ id: "duplicate-create-admin" });
    const member = await createVerifiedMember({
      id: "duplicate-create-member",
    });
    const hero = await createHero({ name: "Duplicate Create Hero" });
    const client = createAuthenticatedRouterClient(admin);

    await expect(
      client.bet.create({ heroId: hero.id, userIds: [member.id, member.id] })
    ).rejects.toBeInstanceOf(ORPCError);

    await expect(client.bet.getAll()).resolves.toEqual([]);
  });

  it("rejects unverified members when creating a hero bet", async () => {
    const admin = await createAdmin({ id: "unverified-create-admin" });
    const unverified = await createUnverifiedUser({
      id: "unverified-create-member",
    });
    const hero = await createHero({ name: "Unverified Create Hero" });
    const client = createAuthenticatedRouterClient(admin);

    await expect(
      client.bet.create({ heroId: hero.id, userIds: [unverified.id] })
    ).rejects.toBeInstanceOf(ORPCError);

    await expect(client.bet.getAll()).resolves.toEqual([]);
  });

  it("rejects duplicate members when editing and preserves original members", async () => {
    const admin = await createAdmin({ id: "duplicate-edit-admin" });
    const firstMember = await createVerifiedMember({
      id: "duplicate-edit-one",
    });
    const secondMember = await createVerifiedMember({
      id: "duplicate-edit-two",
    });
    const hero = await createHero({ name: "Duplicate Edit Hero" });
    const client = createAuthenticatedRouterClient(admin);

    const createdBet = await client.bet.create({
      heroId: hero.id,
      userIds: [firstMember.id, secondMember.id],
    });

    await expect(
      client.bet.edit({
        betId: createdBet.id,
        newUserIds: [firstMember.id, firstMember.id],
      })
    ).rejects.toBeInstanceOf(ORPCError);

    await expect(
      client.bet.getBetMembers({ betId: createdBet.id })
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: firstMember.id }),
        expect.objectContaining({ userId: secondMember.id }),
      ])
    );
  });

  it("rejects unverified members when editing and preserves original members", async () => {
    const admin = await createAdmin({ id: "unverified-edit-admin" });
    const verified = await createVerifiedMember({ id: "unverified-edit-good" });
    const unverified = await createUnverifiedUser({
      id: "unverified-edit-bad",
    });
    const hero = await createHero({ name: "Unverified Edit Hero" });
    const client = createAuthenticatedRouterClient(admin);

    const createdBet = await client.bet.create({
      heroId: hero.id,
      userIds: [verified.id],
    });

    await expect(
      client.bet.edit({
        betId: createdBet.id,
        newUserIds: [verified.id, unverified.id],
      })
    ).rejects.toBeInstanceOf(ORPCError);

    await expect(
      client.bet.getBetMembers({ betId: createdBet.id })
    ).resolves.toEqual([expect.objectContaining({ userId: verified.id })]);
  });
});
