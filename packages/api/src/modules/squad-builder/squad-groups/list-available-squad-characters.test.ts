import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAccountDisplayName } from "../account-display-name.js";
import { parseAppUserId } from "../app-user-id.js";
import { parseMargonemAccountId } from "../margonem-account-id.js";
import {
  parseMargonemCharacterId,
  parsePositiveLevel,
} from "../margonem-profile-id.js";
import { isOk } from "../result.js";
import { parseSquadGroupId } from "../squad-group-id.js";
import type { AvailableSquadCharacter } from "../squad-group-snapshot.js";
import { makeEffectSquadGroupStoreTestService } from "./effect-squad-group-store.test-support.js";
import { ListAvailableSquadCharacters } from "./list-available-squad-characters.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadGroupDetail } from "./squad-group-store.js";

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestAccountDisplayName = (value: string) => {
  const displayName = parseAccountDisplayName(value);

  if (!isOk(displayName)) {
    throw new Error("Expected test account display name to be valid");
  }

  return displayName.value;
};

const parseTestAccountId = (value: number) => {
  const accountId = parseMargonemAccountId(value);

  if (!isOk(accountId)) {
    throw new Error("Expected test account id to be valid");
  }

  return accountId.value;
};

const parseTestCharacterId = (value: number) => {
  const characterId = parseMargonemCharacterId(value);

  if (!isOk(characterId)) {
    throw new Error("Expected test character id to be valid");
  }

  return characterId.value;
};

const parseTestLevel = (value: number) => {
  const level = parsePositiveLevel(value);

  if (!isOk(level)) {
    throw new Error("Expected test level to be valid");
  }

  return level.value;
};

const parseTestGroupId = (value: number) => {
  const groupId = parseSquadGroupId(value);

  if (!isOk(groupId)) {
    throw new Error("Expected test squad group id to be valid");
  }

  return groupId.value;
};

it.effect("lists characters for the loaded squad group owner", () => {
  const actorUserId = parseTestUserId("available-effect-actor");
  const ownerUserId = parseTestUserId("available-effect-owner");
  const groupId = parseTestGroupId(321);
  const detail: SquadGroupDetail = {
    accessRole: "editor",
    groupId,
    name: "Shared group",
    ownerUserId,
    squads: [],
    updatedAt: new Date("2026-06-30T15:00:00.000Z"),
    visibility: "private",
  };
  const characters: readonly AvailableSquadCharacter[] = [
    {
      accountDisplayName: parseTestAccountDisplayName("Main account"),
      accountId: parseTestAccountId(1001),
      accountOwnerUserId: ownerUserId,
      accountOwnerUserImage: null,
      accountOwnerUserName: "Owner",
      avatarUrl: null,
      characterId: 2001,
      level: parseTestLevel(315),
      margonemCharacterId: parseTestCharacterId(1_296_625),
      name: "informati",
      profession: "tracker",
      world: "jaruna",
    },
  ];
  const store = makeEffectSquadGroupStoreTestService({
    getSquadGroupDetail: (input) =>
      input.actorUserId === actorUserId && input.groupId === groupId
        ? Effect.succeed(detail)
        : Effect.die(new Error("Unexpected getSquadGroupDetail input")),
    listAvailableCharactersForOwner: (input) =>
      input.ownerUserId === ownerUserId
        ? Effect.succeed(characters)
        : Effect.die(
            new Error("Unexpected listAvailableCharactersForOwner input")
          ),
  });
  const service = new ListAvailableSquadCharacters();

  return Effect.gen(function* listAvailableSquadCharactersEffect() {
    const result = yield* service.list({ actorUserId, groupId });

    expect(result).toBe(characters);
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});
