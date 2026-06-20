import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import {
  createAdmin,
  createHero,
  createVerifiedMember,
} from "../test/integration/builders";
import { createAuthenticatedRouterClient } from "../test/integration/router-client";

describe("vault router Postgres integration", () => {
  it("lets an admin distribute hero gold into member earnings", async () => {
    const admin = await createAdmin({ id: "vault-admin" });
    const firstMember = await createVerifiedMember({
      id: "vault-member-one",
      name: "Vault Member One",
    });
    const secondMember = await createVerifiedMember({
      id: "vault-member-two",
      name: "Vault Member Two",
    });
    const hero = await createHero({ name: "Vault Hero" });
    const client = createAuthenticatedRouterClient(admin);

    await client.bet.create({
      heroId: hero.id,
      userIds: [firstMember.id, secondMember.id],
    });

    await expect(
      client.vault.distributeGold({ goldAmount: 200_000_000, heroId: hero.id })
    ).resolves.toMatchObject({
      goldAmount: 200_000_000,
      heroId: hero.id,
      heroName: "Vault Hero",
      pointWorth: 10_000_000,
      success: true,
      totalPoints: 20,
      usersUpdated: 2,
    });

    await expect(
      client.vault.getVault({ eventId: hero.eventId })
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          paidOut: false,
          totalEarnings: "100000000.00",
          userId: firstMember.id,
          userName: "Vault Member One",
        }),
        expect.objectContaining({
          paidOut: false,
          totalEarnings: "100000000.00",
          userId: secondMember.id,
          userName: "Vault Member Two",
        }),
      ])
    );
  });

  it("lets an admin mark a member paid out for one event", async () => {
    const admin = await createAdmin({ id: "paid-out-admin" });
    const member = await createVerifiedMember({ id: "paid-out-member" });
    const hero = await createHero({ name: "Paid Out Hero" });
    const client = createAuthenticatedRouterClient(admin);

    await client.bet.create({ heroId: hero.id, userIds: [member.id] });
    await client.vault.distributeGold({
      goldAmount: 200_000_000,
      heroId: hero.id,
    });

    await expect(
      client.vault.togglePaidOut({
        eventId: hero.eventId,
        paidOut: true,
        userId: member.id,
      })
    ).resolves.toEqual({ success: true });

    await expect(
      client.vault.getVault({ eventId: hero.eventId })
    ).resolves.toEqual([
      expect.objectContaining({ paidOut: true, userId: member.id }),
    ]);
  });

  it("prevents verified non-admin members from distributing gold", async () => {
    const member = await createVerifiedMember({ id: "vault-non-admin" });
    const hero = await createHero({ name: "Protected Vault Hero" });
    const client = createAuthenticatedRouterClient(member);

    await expect(
      client.vault.distributeGold({ goldAmount: 200_000_000, heroId: hero.id })
    ).rejects.toBeInstanceOf(ORPCError);
  });
});
