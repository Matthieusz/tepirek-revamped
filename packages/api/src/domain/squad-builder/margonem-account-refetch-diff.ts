import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import type { MargonemAccountId } from "./margonem-account-id.ts";
import type {
  MargonemCharacterPreview,
  MargonemProfession,
  MargonemWorld,
} from "./margonem-character.ts";
import type {
  MargonemCharacterId,
  MargonemProfileId,
  PositiveLevel,
} from "./margonem-profile-id.ts";

/** Stored Jaruna character state used when comparing a saved account with latest profile data. */
export interface StoredMargonemCharacterSnapshot {
  readonly databaseCharacterId: number;
  readonly margonemCharacterId: MargonemCharacterId;
  readonly name: string;
  readonly level: PositiveLevel;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
  readonly world: MargonemWorld;
  readonly affectedSquadCount: number;
}

/** Diff for a latest character that is not yet stored. */
export interface AddedMargonemCharacterDiff {
  readonly _tag: "AddedCharacter";
  readonly latest: MargonemCharacterPreview;
}

/** Diff for a stored character absent from the latest Jaruna profile. */
export interface RemovedMargonemCharacterDiff {
  readonly _tag: "RemovedCharacter";
  readonly current: StoredMargonemCharacterSnapshot;
  readonly reason: "missingFromLatestJarunaProfile";
}

/** A changed stored character field. */
export type MargonemCharacterFieldChange =
  | {
      readonly field: "name";
      readonly before: string;
      readonly after: string;
    }
  | {
      readonly field: "level";
      readonly before: PositiveLevel;
      readonly after: PositiveLevel;
    }
  | {
      readonly field: "profession";
      readonly before: MargonemProfession;
      readonly after: MargonemProfession;
    }
  | {
      readonly field: "avatarUrl";
      readonly before: string | null;
      readonly after: string | null;
    };

/** Diff for a stored character whose latest profile metadata changed. */
export interface ChangedMargonemCharacterDiff {
  readonly _tag: "ChangedCharacter";
  readonly databaseCharacterId: number;
  readonly margonemCharacterId: MargonemCharacterId;
  readonly changes: readonly MargonemCharacterFieldChange[];
  readonly current: StoredMargonemCharacterSnapshot;
  readonly latest: MargonemCharacterPreview;
}

/** Account-level Jaruna character refetch diff. */
export interface MargonemAccountRefetchDiff {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly added: readonly AddedMargonemCharacterDiff[];
  readonly removed: readonly RemovedMargonemCharacterDiff[];
  readonly changed: readonly ChangedMargonemCharacterDiff[];
  readonly unchangedCount: number;
}

/** Input for computing a Jaruna-only account refetch diff. */
export interface ComputeMargonemAccountRefetchDiffInput {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly currentCharacters: readonly StoredMargonemCharacterSnapshot[];
  readonly latestCharacters: readonly MargonemCharacterPreview[];
}

const fieldChangesForCharacter = (
  current: StoredMargonemCharacterSnapshot,
  latest: MargonemCharacterPreview
): readonly MargonemCharacterFieldChange[] => {
  const changes: MargonemCharacterFieldChange[] = [];

  if (current.name !== latest.name) {
    changes.push({ after: latest.name, before: current.name, field: "name" });
  }

  if (current.level !== latest.level) {
    changes.push({
      after: latest.level,
      before: current.level,
      field: "level",
    });
  }

  if (current.profession !== latest.profession) {
    changes.push({
      after: latest.profession,
      before: current.profession,
      field: "profession",
    });
  }

  if (current.avatarUrl !== latest.avatarUrl) {
    changes.push({
      after: latest.avatarUrl,
      before: current.avatarUrl,
      field: "avatarUrl",
    });
  }

  return changes;
};

/** Compute a Jaruna-only character diff for a refetched Margonem account. */
export const computeMargonemAccountRefetchDiff = ({
  accountId,
  currentCharacters,
  fetchedAt,
  latestCharacters,
  profileId,
}: ComputeMargonemAccountRefetchDiffInput): MargonemAccountRefetchDiff => {
  const currentByCharacterId = HashMap.fromIterable(
    currentCharacters.map(
      (current) => [current.margonemCharacterId, current] as const
    )
  );
  const latestByCharacterId = HashMap.fromIterable(
    latestCharacters.map((latest) => [latest.characterId, latest] as const)
  );

  const added: AddedMargonemCharacterDiff[] = [];
  const removed: RemovedMargonemCharacterDiff[] = [];
  const changed: ChangedMargonemCharacterDiff[] = [];
  let unchangedCount = 0;

  for (const latest of latestCharacters) {
    const currentOption = HashMap.get(currentByCharacterId, latest.characterId);

    if (Option.isNone(currentOption)) {
      added.push({ _tag: "AddedCharacter", latest });
      continue;
    }
    const current = currentOption.value;

    const changes = fieldChangesForCharacter(current, latest);

    if (changes.length === 0) {
      unchangedCount += 1;
      continue;
    }

    changed.push({
      _tag: "ChangedCharacter",
      changes,
      current,
      databaseCharacterId: current.databaseCharacterId,
      latest,
      margonemCharacterId: current.margonemCharacterId,
    });
  }

  for (const current of currentCharacters) {
    if (!HashMap.has(latestByCharacterId, current.margonemCharacterId)) {
      removed.push({
        _tag: "RemovedCharacter",
        current,
        reason: "missingFromLatestJarunaProfile",
      });
    }
  }

  return {
    accountId,
    added,
    changed,
    fetchedAt,
    profileId,
    removed,
    unchangedCount,
  };
};
