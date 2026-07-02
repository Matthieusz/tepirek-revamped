import {
  margonemAccount,
  margonemAccountAccess,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
} from "@tepirek-revamped/db/schema/squad-builder";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createVerifiedMember } from "../../test/integration/builders.js";
import { testDb } from "../../test/integration/database.js";
import { parseAppUserId } from "./app-user-id.js";
import { parseFirecrawlYearMonth } from "./firecrawl-year-month.js";
import { parseMargonemAccountId } from "./margonem-account-id.js";
import { parseMargonemProfileId } from "./margonem-profile-id.js";
import { isError, isOk } from "./result.js";
import { DrizzleSquadBuilderStore } from "./squad-builder-store.js";

const parseTestProfileId = (value = 7_298_897) => {
  const profileId = parseMargonemProfileId(value);

  if (!isOk(profileId)) {
    throw new Error("Expected test profile id to be valid");
  }

  return profileId.value;
};

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestYearMonth = () => {
  const yearMonth = parseFirecrawlYearMonth("2026-06");

  if (!isOk(yearMonth)) {
    throw new Error("Expected test year-month to be valid");
  }

  return yearMonth.value;
};

const parseTestAccountId = (value: number) => {
  const id = parseMargonemAccountId(value);

  if (!isOk(id)) {
    throw new Error("Expected test account id to be valid");
  }

  return id.value;
};

describe("DrizzleSquadBuilderStore integration", () => {
  it("reports profile access state for available, owned, owned-by-other, and shared profiles", async () => {
    const owner = await createVerifiedMember({ id: "margonem-owner" });
    const otherUser = await createVerifiedMember({
      id: "margonem-shared-user",
    });
    const store = new DrizzleSquadBuilderStore();

    await expect(
      store.findProfileAccessState({
        actorUserId: parseTestUserId(owner.id),
        profileId: parseTestProfileId(),
      })
    ).resolves.toEqual(
      expect.objectContaining({ value: { _tag: "Available" } })
    );

    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Main account",
        ownerUserId: owner.id,
        profileId: 7_298_897,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to create test Margonem account");
    }

    await expect(
      store.findProfileAccessState({
        actorUserId: parseTestUserId(owner.id),
        profileId: parseTestProfileId(),
      })
    ).resolves.toEqual(
      expect.objectContaining({ value: { _tag: "OwnedByActor" } })
    );

    await expect(
      store.findProfileAccessState({
        actorUserId: parseTestUserId(otherUser.id),
        profileId: parseTestProfileId(),
      })
    ).resolves.toEqual(
      expect.objectContaining({ value: { _tag: "OwnedByAnotherUser" } })
    );

    await testDb.insert(margonemAccountAccess).values({
      accountId: account.id,
      invitedByUserId: owner.id,
      status: "accepted",
      userId: otherUser.id,
    });

    await expect(
      store.findProfileAccessState({
        actorUserId: parseTestUserId(otherUser.id),
        profileId: parseTestProfileId(),
      })
    ).resolves.toEqual(
      expect.objectContaining({ value: { _tag: "SharedWithActor" } })
    );
  });

  it("reserves Firecrawl budget and rejects reservations after monthly budget exhaustion", async () => {
    const member = await createVerifiedMember({ id: "firecrawl-budget-user" });
    const store = new DrizzleSquadBuilderStore();

    const firstReservation = await store.reserveRequest({
      monthlyRequestBudget: 1,
      profileId: parseTestProfileId(),
      requestedByUserId: parseTestUserId(member.id),
      yearMonth: parseTestYearMonth(),
    });

    expect(isOk(firstReservation)).toBe(true);

    const secondReservation = await store.reserveRequest({
      monthlyRequestBudget: 1,
      profileId: parseTestProfileId(7_298_898),
      requestedByUserId: parseTestUserId(member.id),
      yearMonth: parseTestYearMonth(),
    });

    expect(isError(secondReservation)).toBe(true);

    if (!isError(secondReservation)) {
      throw new Error("Expected second reservation to fail");
    }

    expect(secondReservation.error._tag).toBe(
      "FirecrawlMonthlyBudgetExhausted"
    );
  });
});

const createOwnedAccountRow = async (
  owner: { id: string },
  profileId: number,
  displayName = "Shared account"
) => {
  const [account] = await testDb
    .insert(margonemAccount)
    .values({
      displayName,
      ownerUserId: owner.id,
      profileId,
    })
    .returning({ id: margonemAccount.id });

  if (account === undefined) {
    throw new Error("Failed to create test Margonem account");
  }

  return account;
};

const createJarunaCharacterRow = async (
  accountId: number,
  characterId: number
) => {
  const [character] = await testDb
    .insert(margonemCharacter)
    .values({
      accountId,
      characterId,
      level: 100,
      name: `Char ${characterId}`,
      profession: "warrior",
      world: "jaruna",
    })
    .returning({ id: margonemCharacter.id });

  if (character === undefined) {
    throw new Error("Failed to create test character");
  }

  return character;
};

const createSquadWithCharacterFor = async (
  ownerUserId: string,
  characterId: number
) => {
  const [group] = await testDb
    .insert(squadGroup)
    .values({ name: "Group", ownerUserId })
    .returning({ id: squadGroup.id });

  if (group === undefined) {
    throw new Error("Failed to create test squad group");
  }

  const [createdSquad] = await testDb
    .insert(squad)
    .values({ name: "Squad", position: 0, squadGroupId: group.id })
    .returning({ id: squad.id });

  if (createdSquad === undefined) {
    throw new Error("Failed to create test squad");
  }

  const [character] = await testDb
    .select({ accountId: margonemCharacter.accountId })
    .from(margonemCharacter)
    .where(eq(margonemCharacter.id, characterId))
    .limit(1);

  if (character === undefined) {
    throw new Error("Failed to load test character account");
  }

  await testDb.insert(squadCharacter).values({
    accountId: character.accountId,
    characterId,
    position: 0,
    squadGroupId: group.id,
    squadId: createdSquad.id,
  });

  return createdSquad.id;
};

const countSquadCharactersFor = async (ownerUserId: string) => {
  const rows = await testDb
    .select({ id: squadCharacter.id })
    .from(squadCharacter)
    .innerJoin(squad, eq(squad.id, squadCharacter.squadId))
    .innerJoin(squadGroup, eq(squadGroup.id, squad.squadGroupId))
    .where(eq(squadGroup.ownerUserId, ownerUserId));

  return rows.length;
};

describe("DrizzleSquadBuilderStore account sharing integration", () => {
  it("sends, accepts, and lists a shared account, then revokes and cleans up squads", async () => {
    const owner = await createVerifiedMember({ id: "sharing-owner" });
    const recipient = await createVerifiedMember({
      id: "sharing-recipient",
      name: "Recipient",
    });
    const store = new DrizzleSquadBuilderStore();
    const now = new Date("2026-06-29T12:00:00.000Z");

    const account = await createOwnedAccountRow(owner, 7_400_001);
    const character = await createJarunaCharacterRow(account.id, 501);
    await createSquadWithCharacterFor(recipient.id, character.id);

    const invited = await store.upsertAccountAccessInvite({
      accountId: parseTestAccountId(account.id),
      invitedUserId: parseTestUserId(recipient.id),
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    expect(isOk(invited)).toBe(true);

    if (!isOk(invited)) {
      throw new Error("Expected invite upsert to succeed");
    }

    expect(invited.value.status).toBe("pending");
    const inviteAccessId = invited.value.accessId;

    // Sending again while pending must conflict.
    const resend = await store.upsertAccountAccessInvite({
      accountId: parseTestAccountId(account.id),
      invitedUserId: parseTestUserId(recipient.id),
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    expect(isError(resend)).toBe(true);

    if (!isError(resend)) {
      throw new Error("Expected re-send to conflict");
    }

    expect(resend.error._tag).toBe("AccountAccessTransitionNotAllowed");

    // The recipient accepts.
    const accepted = await store.respondToAccountAccessInvite({
      accessId: inviteAccessId,
      invitedUserId: parseTestUserId(recipient.id),
      now,
      response: "accept",
    });

    expect(isOk(accepted)).toBe(true);

    if (!isOk(accepted)) {
      throw new Error("Expected accept to succeed");
    }

    expect(accepted.value.status).toBe("accepted");

    // Shared-with-me list reflects the accepted account.
    const shared = await store.listSharedAccounts({
      actorUserId: parseTestUserId(recipient.id),
    });

    expect(isOk(shared)).toBe(true);

    if (!isOk(shared)) {
      throw new Error("Expected shared accounts list to succeed");
    }

    expect(shared.value).toHaveLength(1);
    expect(shared.value[0]?.accountId).toBe(parseTestAccountId(account.id));

    // Owner grants list shows the accepted grant.
    const grants = await store.listAccountAccessGrants({
      accountId: parseTestAccountId(account.id),
      actorUserId: parseTestUserId(owner.id),
    });

    expect(isOk(grants)).toBe(true);

    if (!isOk(grants)) {
      throw new Error("Expected grants list to succeed");
    }

    expect(grants.value[0]?.status).toBe("accepted");

    // Revoke accepted access and clean up the recipient's squad characters.
    expect(await countSquadCharactersFor(recipient.id)).toBe(1);

    const revoked = await store.revokeAccountAccess({
      accessId: inviteAccessId,
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    expect(isOk(revoked)).toBe(true);

    if (!isOk(revoked)) {
      throw new Error("Expected revoke to succeed");
    }

    expect(revoked.value.removedSquadCharacterCount).toBe(1);
    expect(await countSquadCharactersFor(recipient.id)).toBe(0);

    // Shared-with-me list no longer includes the revoked account.
    const sharedAfter = await store.listSharedAccounts({
      actorUserId: parseTestUserId(recipient.id),
    });

    expect(isOk(sharedAfter)).toBe(true);

    if (!isOk(sharedAfter)) {
      throw new Error("Expected post-revoke shared list to succeed");
    }

    expect(sharedAfter.value).toHaveLength(0);
  });

  it("revokes a pending invite without deleting squad characters", async () => {
    const owner = await createVerifiedMember({ id: "pending-revoke-owner" });
    const recipient = await createVerifiedMember({
      id: "pending-revoke-recipient",
    });
    const store = new DrizzleSquadBuilderStore();
    const now = new Date("2026-06-29T12:00:00.000Z");

    const account = await createOwnedAccountRow(owner, 7_400_002);
    const character = await createJarunaCharacterRow(account.id, 502);
    await createSquadWithCharacterFor(recipient.id, character.id);

    const invited = await store.upsertAccountAccessInvite({
      accountId: parseTestAccountId(account.id),
      invitedUserId: parseTestUserId(recipient.id),
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    if (!isOk(invited)) {
      throw new Error("Expected invite upsert to succeed");
    }

    expect(await countSquadCharactersFor(recipient.id)).toBe(1);

    const revoked = await store.revokeAccountAccess({
      accessId: invited.value.accessId,
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    expect(isOk(revoked)).toBe(true);

    if (!isOk(revoked)) {
      throw new Error("Expected pending revoke to succeed");
    }

    expect(revoked.value.removedSquadCharacterCount).toBe(0);
    expect(await countSquadCharactersFor(recipient.id)).toBe(1);
  });

  it("allows re-sending an invite after it was declined", async () => {
    const owner = await createVerifiedMember({ id: "resend-owner" });
    const recipient = await createVerifiedMember({
      id: "resend-recipient",
    });
    const store = new DrizzleSquadBuilderStore();
    const now = new Date("2026-06-29T12:00:00.000Z");

    const account = await createOwnedAccountRow(owner, 7_400_003);

    const invited = await store.upsertAccountAccessInvite({
      accountId: parseTestAccountId(account.id),
      invitedUserId: parseTestUserId(recipient.id),
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    if (!isOk(invited)) {
      throw new Error("Expected invite upsert to succeed");
    }

    const declined = await store.respondToAccountAccessInvite({
      accessId: invited.value.accessId,
      invitedUserId: parseTestUserId(recipient.id),
      now,
      response: "decline",
    });

    expect(isOk(declined)).toBe(true);

    if (!isOk(declined)) {
      throw new Error("Expected decline to succeed");
    }

    expect(declined.value.status).toBe("declined");

    const resend = await store.upsertAccountAccessInvite({
      accountId: parseTestAccountId(account.id),
      invitedUserId: parseTestUserId(recipient.id),
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    expect(isOk(resend)).toBe(true);

    if (!isOk(resend)) {
      throw new Error("Expected re-send after decline to succeed");
    }

    expect(resend.value.status).toBe("pending");
  });

  it("forbids revoking access for an account owned by another user", async () => {
    const owner = await createVerifiedMember({ id: "revoke-forbid-owner" });
    const attacker = await createVerifiedMember({
      id: "revoke-forbid-attacker",
    });
    const recipient = await createVerifiedMember({
      id: "revoke-forbid-recipient",
    });
    const store = new DrizzleSquadBuilderStore();
    const now = new Date("2026-06-29T12:00:00.000Z");

    const account = await createOwnedAccountRow(owner, 7_400_004);

    const invited = await store.upsertAccountAccessInvite({
      accountId: parseTestAccountId(account.id),
      invitedUserId: parseTestUserId(recipient.id),
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    if (!isOk(invited)) {
      throw new Error("Expected invite upsert to succeed");
    }

    const revoked = await store.revokeAccountAccess({
      accessId: invited.value.accessId,
      now,
      ownerUserId: parseTestUserId(attacker.id),
    });

    expect(isError(revoked)).toBe(true);

    if (!isError(revoked)) {
      throw new Error("Expected non-owner revoke to fail");
    }

    expect(revoked.error._tag).toBe("ActorDoesNotOwnMargonemAccount");
  });

  it("excludes existing pending and accepted users from invite target search", async () => {
    const owner = await createVerifiedMember({
      id: "search-owner",
      name: "Search Owner",
    });
    const pendingUser = await createVerifiedMember({
      id: "search-pending",
      name: "Alpha Pending",
    });
    const acceptedUser = await createVerifiedMember({
      id: "search-accepted",
      name: "Alpha Accepted",
    });
    const freeUser = await createVerifiedMember({
      id: "search-free",
      name: "Alpha Free",
    });
    const store = new DrizzleSquadBuilderStore();
    const now = new Date("2026-06-29T12:00:00.000Z");

    const account = await createOwnedAccountRow(owner, 7_400_005);

    await store.upsertAccountAccessInvite({
      accountId: parseTestAccountId(account.id),
      invitedUserId: parseTestUserId(pendingUser.id),
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    const acceptedInvite = await store.upsertAccountAccessInvite({
      accountId: parseTestAccountId(account.id),
      invitedUserId: parseTestUserId(acceptedUser.id),
      now,
      ownerUserId: parseTestUserId(owner.id),
    });

    if (!isOk(acceptedInvite)) {
      throw new Error("Expected accepted invite setup to succeed");
    }

    await store.respondToAccountAccessInvite({
      accessId: acceptedInvite.value.accessId,
      invitedUserId: parseTestUserId(acceptedUser.id),
      now,
      response: "accept",
    });

    const results = await store.searchInviteTargets({
      accountId: parseTestAccountId(account.id),
      actorUserId: parseTestUserId(owner.id),
      query: "Alpha",
    });

    expect(isOk(results)).toBe(true);

    if (!isOk(results)) {
      throw new Error("Expected search to succeed");
    }

    const foundIds = results.value.map(
      (target) => target.userId as unknown as string
    );

    expect(foundIds).toContain(freeUser.id);
    expect(foundIds).not.toContain(pendingUser.id);
    expect(foundIds).not.toContain(acceptedUser.id);
    expect(foundIds).not.toContain(owner.id);
  });
});
