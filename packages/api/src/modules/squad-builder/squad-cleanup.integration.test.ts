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
import { parseMargonemAccountAccessId } from "./margonem-account-access-id.js";
import { parseMargonemAccountId } from "./margonem-account-id.js";
import {
  parseMargonemCharacterId,
  parseMargonemProfileId,
  parsePositiveLevel,
} from "./margonem-profile-id.js";
import { parsePendingMargonemAccountRefetchId } from "./pending-margonem-account-refetch-id.js";
import { isOk } from "./result.js";
import { DrizzleSquadBuilderStore } from "./squad-builder-store.js";

const parseTestUserId = (value: string) => {
  const parsed = parseAppUserId(value);

  if (!isOk(parsed)) {
    throw new Error("Expected test user id to be valid");
  }

  return parsed.value;
};

const parseTestAccountAccessId = (value: number) => {
  const parsed = parseMargonemAccountAccessId(value);

  if (!isOk(parsed)) {
    throw new Error("Expected test account access id to be valid");
  }

  return parsed.value;
};

const parseTestAccountId = (value: number) => {
  const parsed = parseMargonemAccountId(value);

  if (!isOk(parsed)) {
    throw new Error("Expected test account id to be valid");
  }

  return parsed.value;
};

const parseTestRefetchId = (value: number) => {
  const parsed = parsePendingMargonemAccountRefetchId(value);

  if (!isOk(parsed)) {
    throw new Error("Expected test pending refetch id to be valid");
  }

  return parsed.value;
};

const parseTestCharacterId = (value: number) => {
  const parsed = parseMargonemCharacterId(value);

  if (!isOk(parsed)) {
    throw new Error("Expected test character id to be valid");
  }

  return parsed.value;
};

const parseTestLevel = (value: number) => {
  const parsed = parsePositiveLevel(value);

  if (!isOk(parsed)) {
    throw new Error("Expected test level to be valid");
  }

  return parsed.value;
};

const parseTestProfileId = (value: number) => {
  const parsed = parseMargonemProfileId(value);

  if (!isOk(parsed)) {
    throw new Error("Expected test profile id to be valid");
  }

  return parsed.value;
};

const createAccount = async (ownerUserId: string, profileId: number) => {
  const [account] = await testDb
    .insert(margonemAccount)
    .values({ displayName: `Account ${profileId}`, ownerUserId, profileId })
    .returning({ id: margonemAccount.id });

  if (account === undefined) {
    throw new Error("Failed to create account");
  }

  return account;
};

const createCharacter = async (accountId: number, characterId: number) => {
  const [character] = await testDb
    .insert(margonemCharacter)
    .values({
      accountId,
      characterId,
      level: 100,
      name: `Character ${characterId}`,
      profession: "warrior",
      world: "jaruna",
    })
    .returning({ id: margonemCharacter.id });

  if (character === undefined) {
    throw new Error("Failed to create character");
  }

  return character;
};

const createPlacedCharacter = async ({
  characterDatabaseId,
  groupOwnerUserId,
}: {
  readonly characterDatabaseId: number;
  readonly groupOwnerUserId: string;
}) => {
  const originalUpdatedAt = new Date("2026-06-01T00:00:00.000Z");
  const [group] = await testDb
    .insert(squadGroup)
    .values({
      name: `Group ${groupOwnerUserId}`,
      ownerUserId: groupOwnerUserId,
      updatedAt: originalUpdatedAt,
    })
    .returning({ id: squadGroup.id });

  if (group === undefined) {
    throw new Error("Failed to create squad group");
  }

  const [createdSquad] = await testDb
    .insert(squad)
    .values({ name: "Squad", position: 0, squadGroupId: group.id })
    .returning({ id: squad.id });

  if (createdSquad === undefined) {
    throw new Error("Failed to create squad");
  }

  const [character] = await testDb
    .select({ accountId: margonemCharacter.accountId })
    .from(margonemCharacter)
    .where(eq(margonemCharacter.id, characterDatabaseId))
    .limit(1);

  if (character === undefined) {
    throw new Error("Failed to load character account");
  }

  await testDb.insert(squadCharacter).values({
    accountId: character.accountId,
    characterId: characterDatabaseId,
    position: 0,
    squadGroupId: group.id,
    squadId: createdSquad.id,
  });

  return { groupId: group.id, originalUpdatedAt };
};

const countPlacementsForGroup = async (groupId: number) => {
  const rows = await testDb
    .select({ id: squadCharacter.id })
    .from(squadCharacter)
    .where(eq(squadCharacter.squadGroupId, groupId));

  return rows.length;
};

const loadGroupUpdatedAt = async (groupId: number) => {
  const [group] = await testDb
    .select({ updatedAt: squadGroup.updatedAt })
    .from(squadGroup)
    .where(eq(squadGroup.id, groupId))
    .limit(1);

  if (group === undefined) {
    throw new Error("Failed to load squad group");
  }

  return group.updatedAt;
};

describe("squad cleanup integration", () => {
  it("removes revoked account characters only from the revoked user's owned squad groups", async () => {
    const accountOwner = await createVerifiedMember({ id: "cleanup-owner" });
    const revokedUser = await createVerifiedMember({ id: "cleanup-revoked" });
    const unrelatedOwner = await createVerifiedMember({ id: "cleanup-other" });
    const store = new DrizzleSquadBuilderStore();
    const cleanupTime = new Date("2026-06-29T12:00:00.000Z");
    const account = await createAccount(accountOwner.id, 7_510_001);
    const character = await createCharacter(account.id, 9001);
    const revokedUserGroup = await createPlacedCharacter({
      characterDatabaseId: character.id,
      groupOwnerUserId: revokedUser.id,
    });
    const unrelatedGroup = await createPlacedCharacter({
      characterDatabaseId: character.id,
      groupOwnerUserId: unrelatedOwner.id,
    });
    const [access] = await testDb
      .insert(margonemAccountAccess)
      .values({
        accountId: account.id,
        invitedByUserId: accountOwner.id,
        status: "accepted",
        userId: revokedUser.id,
      })
      .returning({ id: margonemAccountAccess.id });

    if (access === undefined) {
      throw new Error("Failed to create account access");
    }

    const revoked = await store.revokeAccountAccess({
      accessId: parseTestAccountAccessId(access.id),
      now: cleanupTime,
      ownerUserId: parseTestUserId(accountOwner.id),
    });

    expect(isOk(revoked)).toBe(true);

    if (!isOk(revoked)) {
      throw new Error("Expected revocation to succeed");
    }

    expect(revoked.value.removedSquadCharacterCount).toBe(1);
    expect(await countPlacementsForGroup(revokedUserGroup.groupId)).toBe(0);
    expect(await countPlacementsForGroup(unrelatedGroup.groupId)).toBe(1);
    expect(await loadGroupUpdatedAt(revokedUserGroup.groupId)).toEqual(
      cleanupTime
    );
    expect(await loadGroupUpdatedAt(unrelatedGroup.groupId)).toEqual(
      unrelatedGroup.originalUpdatedAt
    );
  });

  it("removes deleted refetch characters from every affected squad group", async () => {
    const accountOwner = await createVerifiedMember({
      id: "refetch-cleanup-owner",
    });
    const otherOwner = await createVerifiedMember({
      id: "refetch-cleanup-other",
    });
    const store = new DrizzleSquadBuilderStore();
    const cleanupTime = new Date("2026-06-29T13:00:00.000Z");
    const fetchedAt = new Date("2026-06-29T12:30:00.000Z");
    const account = await createAccount(accountOwner.id, 7_510_002);
    await createCharacter(account.id, 9002);
    const removedCharacter = await createCharacter(account.id, 9003);
    const ownerGroup = await createPlacedCharacter({
      characterDatabaseId: removedCharacter.id,
      groupOwnerUserId: accountOwner.id,
    });
    const otherGroup = await createPlacedCharacter({
      characterDatabaseId: removedCharacter.id,
      groupOwnerUserId: otherOwner.id,
    });

    const applied = await store.applyRefetchedAccount({
      actorUserId: parseTestUserId(accountOwner.id),
      now: cleanupTime,
      pendingRefetch: {
        accountId: parseTestAccountId(account.id),
        actorUserId: parseTestUserId(accountOwner.id),
        fetchedAt,
        id: parseTestRefetchId(1),
        latestCharacters: [
          {
            avatarUrl: null,
            characterId: parseTestCharacterId(9002),
            level: parseTestLevel(101),
            name: "Character 9002 Updated",
            profession: "warrior",
            world: "jaruna",
          },
        ],
        profileId: parseTestProfileId(7_510_002),
      },
    });

    expect(isOk(applied)).toBe(true);

    if (!isOk(applied)) {
      throw new Error("Expected refetch apply to succeed");
    }

    expect(applied.value.removedCharacterCount).toBe(1);
    expect(applied.value.removedSquadCharacterCount).toBe(2);
    expect(await countPlacementsForGroup(ownerGroup.groupId)).toBe(0);
    expect(await countPlacementsForGroup(otherGroup.groupId)).toBe(0);
    expect(await loadGroupUpdatedAt(ownerGroup.groupId)).toEqual(cleanupTime);
    expect(await loadGroupUpdatedAt(otherGroup.groupId)).toEqual(cleanupTime);
  });
});
