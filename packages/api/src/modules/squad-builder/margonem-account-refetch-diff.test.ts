import { describe, expect, it } from "vitest";

import type { MargonemAccountId } from "./margonem-account-id";
import { computeMargonemAccountRefetchDiff } from "./margonem-account-refetch-diff";
import type { StoredMargonemCharacterSnapshot } from "./margonem-account-refetch-diff";
import type { MargonemCharacterPreview } from "./margonem-character";
import type {
  MargonemCharacterId,
  MargonemProfileId,
  PositiveLevel,
} from "./margonem-profile-id";

const accountId = 1 as MargonemAccountId;
const profileId = 7_298_897 as MargonemProfileId;
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
  level: (input.level ?? 100) as PositiveLevel,
  margonemCharacterId: input.margonemCharacterId as MargonemCharacterId,
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
  characterId: input.characterId as MargonemCharacterId,
  level: (input.level ?? 100) as PositiveLevel,
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
