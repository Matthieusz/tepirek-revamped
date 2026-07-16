import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { describe } from "vitest";

import { AccountDisplayName } from "./account-display-name.ts";
import { AppUserId } from "./app-user-id.ts";
import { MargonemAccountId } from "./margonem-account-id.ts";
import { MargonemCharacterId, PositiveLevel } from "./margonem-profile-id.ts";
import { SquadGroupId } from "./squad-group-id.ts";
import { validateSquadGroupSnapshot } from "./squad-group-snapshot.ts";
import type {
  AvailableSquadCharacter,
  SaveSquadInput,
  ValidateSquadGroupSnapshotInput,
} from "./squad-group-snapshot.ts";
import {
  InvalidSquadSnapshot,
  SquadGroupValidationErrorSchema,
} from "./squad-group-validation-errors.ts";

const character = (
  characterId: number,
  overrides: Partial<AvailableSquadCharacter> = {}
): AvailableSquadCharacter => ({
  accountDisplayName: AccountDisplayName.make(`account-${characterId}`),
  accountId: MargonemAccountId.make(characterId),
  accountOwnerUserId: AppUserId.make("owner"),
  accountOwnerUserImage: null,
  accountOwnerUserName: "Owner",
  avatarUrl: null,
  characterId,
  level: PositiveLevel.make(100),
  margonemCharacterId: MargonemCharacterId.make(characterId),
  name: `Character ${characterId}`,
  profession: "warrior",
  world: "jaruna",
  ...overrides,
});

const squad = (
  characters: readonly {
    readonly characterId: number;
    readonly position: number;
  }[],
  overrides: Partial<SaveSquadInput> = {}
): SaveSquadInput => ({
  characters,
  clientKey: "squad-1",
  name: "Squad 1",
  position: 0,
  ...overrides,
});

const input = (
  squads: readonly SaveSquadInput[],
  availableCharacters: readonly AvailableSquadCharacter[]
): ValidateSquadGroupSnapshotInput => ({
  actorUserId: AppUserId.make("owner"),
  availableCharacters,
  groupId: SquadGroupId.make(1),
  name: "Group",
  squads,
});

const validationFailure = (value: ValidateSquadGroupSnapshotInput) =>
  validateSquadGroupSnapshot(value).pipe(Effect.flip);

describe("validateSquadGroupSnapshot", () => {
  it.effect("accepts a valid snapshot", () =>
    Effect.gen(function* acceptValidSnapshot() {
      const result = yield* validateSquadGroupSnapshot(
        input([squad([{ characterId: 1, position: 0 }])], [character(1)])
      );

      expect(result.squads).toHaveLength(1);
      expect(result.squads[0]?.characters).toEqual([
        { characterId: 1, position: 0 },
      ]);
    })
  );

  it.effect("encodes schema-tagged validation failures", () =>
    Effect.gen(function* encodeValidationError() {
      const encoded = yield* Schema.encodeEffect(
        SquadGroupValidationErrorSchema
      )(new InvalidSquadSnapshot({ message: "invalid" }));

      expect(encoded).toEqual({
        _tag: "InvalidSquadSnapshot",
        message: "invalid",
      });
    })
  );

  it.effect("rejects a blank client key with a tagged snapshot error", () =>
    Effect.gen(function* rejectBlankClientKey() {
      const error = yield* validationFailure(
        input(
          [squad([{ characterId: 1, position: 0 }], { clientKey: "  " })],
          [character(1)]
        )
      );

      expect(error).toMatchObject({
        _tag: "InvalidSquadSnapshot",
        message: "Każdy skład musi mieć klucz klienta",
      });
    })
  );

  it.effect("rejects a squad that exceeds the character limit", () =>
    Effect.gen(function* rejectTooManyCharacters() {
      const error = yield* validationFailure(
        input(
          [
            squad(
              Array.from({ length: 11 }, (_, index) => ({
                characterId: index + 1,
                position: index,
              }))
            ),
          ],
          []
        )
      );

      expect(error).toMatchObject({
        _tag: "TooManyCharactersInSquad",
        maxCharacters: 10,
        squadClientKey: "squad-1",
      });
    })
  );

  it.effect("rejects an inaccessible character", () =>
    Effect.gen(function* rejectInaccessibleCharacter() {
      const error = yield* validationFailure(
        input([squad([{ characterId: 2, position: 0 }])], [character(1)])
      );

      expect(error).toMatchObject({
        _tag: "SquadCharacterNotAccessible",
        characterId: 2,
      });
    })
  );

  it.effect("rejects a character from another Margonem world", () =>
    Effect.gen(function* rejectWrongWorld() {
      const error = yield* validationFailure(
        input(
          [squad([{ characterId: 1, position: 0 }])],
          [character(1, { world: "berufs" })]
        )
      );

      expect(error).toMatchObject({
        _tag: "SquadCharacterNotJaruna",
        characterId: 1,
      });
    })
  );

  it.effect("rejects duplicate characters within one squad", () =>
    Effect.gen(function* rejectDuplicateCharacter() {
      const error = yield* validationFailure(
        input(
          [
            squad([
              { characterId: 1, position: 0 },
              { characterId: 1, position: 1 },
            ]),
          ],
          [character(1)]
        )
      );

      expect(error).toMatchObject({
        _tag: "DuplicateCharacterInSquad",
        characterId: 1,
        squadClientKey: "squad-1",
      });
    })
  );

  it.effect("rejects duplicate characters across squads", () =>
    Effect.gen(function* rejectGroupDuplicateCharacter() {
      const error = yield* validationFailure(
        input(
          [
            squad([{ characterId: 1, position: 0 }]),
            squad([{ characterId: 1, position: 0 }], {
              clientKey: "squad-2",
              name: "Squad 2",
              position: 1,
            }),
          ],
          [character(1)]
        )
      );

      expect(error).toMatchObject({
        _tag: "DuplicateCharacterInSquadGroup",
        characterId: 1,
      });
    })
  );

  it.effect("rejects duplicate accounts within one squad", () =>
    Effect.gen(function* rejectDuplicateAccount() {
      const error = yield* validationFailure(
        input(
          [
            squad([
              { characterId: 1, position: 0 },
              { characterId: 2, position: 1 },
            ]),
          ],
          [
            character(1, { accountId: MargonemAccountId.make(10) }),
            character(2, { accountId: MargonemAccountId.make(10) }),
          ]
        )
      );

      expect(error).toMatchObject({
        _tag: "DuplicateAccountInSquad",
        accountId: 10,
        squadClientKey: "squad-1",
      });
    })
  );
});
