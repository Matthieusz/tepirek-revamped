import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.ts";
import type {
  ActorCannotViewSquadGroup,
  AvailableSquadCharacter,
  SquadGroupNotFound,
} from "./squad-group-store.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** Input for listing characters available to a squad group. */
export interface ListAvailableSquadCharactersInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Expected failures returned by listing available squad characters. */
export type ListAvailableSquadCharactersError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

/** Application service for listing characters available to a squad group. */
export interface ListAvailableSquadCharacters {
  readonly list: (
    input: ListAvailableSquadCharactersInput
  ) => Effect.Effect<
    readonly AvailableSquadCharacter[],
    ListAvailableSquadCharactersError
  >;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class ListAvailableSquadCharactersService extends Context.Service<
  ListAvailableSquadCharactersService,
  ListAvailableSquadCharacters
>()(
  "@tepirek-revamped/api/squad-builder/ListAvailableSquadCharactersService"
) {}

/** List Jaruna characters accessible to the squad group owner. */
export const list = Effect.fn("SquadGroups.listAvailableCharacters")(
  function* listAvailableSquadCharacters(
    input: ListAvailableSquadCharactersInput
  ) {
    const group = yield* SquadGroupStoreService.use((store) =>
      store.getSquadGroupDetail(input)
    );

    return yield* SquadGroupStoreService.use((store) =>
      store.listAvailableCharactersForOwner({
        ownerUserId: group.ownerUserId,
      })
    );
  }
);

export const layer = Layer.effect(
  ListAvailableSquadCharactersService,
  Effect.gen(function* makeService() {
    const store = yield* SquadGroupStoreService;

    return ListAvailableSquadCharactersService.of({
      list: Effect.fn("SquadGroups.listAvailableCharacters")(
        function* listAvailableSquadCharacters(
          input: ListAvailableSquadCharactersInput
        ) {
          const group = yield* store.getSquadGroupDetail(input);

          return yield* store.listAvailableCharactersForOwner({
            ownerUserId: group.ownerUserId,
          });
        }
      ),
    });
  })
);
