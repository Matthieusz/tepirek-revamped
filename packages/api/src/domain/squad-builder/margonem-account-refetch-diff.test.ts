import { describe, expect, it } from "vitest";

import { MargonemAccountId } from "./margonem-account-id.js";
import { computeMargonemAccountRefetchDiff } from "./margonem-account-refetch-diff.js";
import type { StoredMargonemCharacterSnapshot } from "./margonem-account-refetch-diff.js";
import type { MargonemCharacterPreview } from "./margonem-character.js";
import {
  MargonemCharacterId,
  MargonemProfileId,
  PositiveLevel,
} from "./margonem-profile-id.js";

const accountId = MargonemAccountId.make(1);
const profileId = MargonemProfileId.make(7_298_897);
const fetchedAt = new Date("2026-06-29T12:00:00.000Z");

type StoredCharacterFixtureInput = Omit<
  Partial<StoredMargonemCharacterSnapshot>,
  "level" | "margonemCharacterId"
> & {
  readonly databaseCharacterId: number;
  readonly level?: number;
  readonly margonemCharacterId: number;
  readonly name: string;
};

const storedCharacter = (
  input: StoredCharacterFixtureInput
): StoredMargonemCharacterSnapshot => ({
  affectedSquadCount: input.affectedSquadCount ?? 0,
  avatarUrl: input.avatarUrl ?? null,
  databaseCharacterId: input.databaseCharacterId,
  level: PositiveLevel.make(input.level ?? 100),
  margonemCharacterId: MargonemCharacterId.make(input.margonemCharacterId),
  name: input.name,
  profession: input.profession ?? "tracker",
  world: input.world ?? "jaruna",
});

type LatestCharacterFixtureInput = Omit<
  Partial<MargonemCharacterPreview>,
  "characterId" | "level"
> & {
  readonly characterId: number;
  readonly level?: number;
  readonly name: string;
};

const latestCharacter = (
  input: LatestCharacterFixtureInput
): MargonemCharacterPreview => ({
  avatarUrl: input.avatarUrl ?? null,
  characterId: MargonemCharacterId.make(input.characterId),
  level: PositiveLevel.make(input.level ?? 100),
  name: input.name,
  profession: input.profession ?? "tracker",
  world: input.world ?? "jaruna",
});

describe("computeMargonemAccountRefetchDiff", () => {
  it("computes added and removed Jaruna characters by Margonem character id", () => {
    const diff = computeMargonemAccountRefetchDiff({
      accountId,
      currentCharacters: [
        storedCharacter({
          databaseCharacterId: 10,
          margonemCharacterId: 1000,
          name: "Removed",
        }),
      ],
      fetchedAt,
      latestCharacters: [latestCharacter({ characterId: 2000, name: "Added" })],
      profileId,
    });

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]?.latest.name).toBe("Added");
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]?.current.name).toBe("Removed");
    expect(diff.removed[0]?.reason).toBe("missingFromLatestJarunaProfile");
  });

  it("computes field changes while counting unchanged characters", () => {
    const diff = computeMargonemAccountRefetchDiff({
      accountId,
      currentCharacters: [
        storedCharacter({
          avatarUrl: "old.gif",
          databaseCharacterId: 10,
          level: 100,
          margonemCharacterId: 1000,
          name: "Old",
          profession: "tracker",
        }),
        storedCharacter({
          databaseCharacterId: 11,
          margonemCharacterId: 1001,
          name: "Same",
        }),
      ],
      fetchedAt,
      latestCharacters: [
        latestCharacter({
          avatarUrl: "new.gif",
          characterId: 1000,
          level: 101,
          name: "New",
          profession: "hunter",
        }),
        latestCharacter({ characterId: 1001, name: "Same" }),
      ],
      profileId,
    });

    expect(diff.unchangedCount).toBe(1);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]?.changes.map((change) => change.field)).toEqual([
      "name",
      "level",
      "profession",
      "avatarUrl",
    ]);
  });
});
