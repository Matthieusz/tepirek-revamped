import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.ts";
import type {
  ActorCannotViewSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-store.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** Expected failures returned by listing actor-owned squad groups. */
export type ListMySquadGroupsError = EffectSquadBuilderPersistenceUnavailable;

/** Expected failures returned by loading a squad group visible to the actor. */
export type GetSquadGroupDetailError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

/** Integration seam that resolves the store from the Effect context. */
export const listMine = Effect.fn("SquadGroups.listMineIntegration")(
  (input: { readonly actorUserId: AppUserId }) =>
    SquadGroupStoreService.use((store) => store.listMySquadGroups(input))
);

/** Integration seam that resolves the store from the Effect context. */
export const getMine = Effect.fn("SquadGroups.getMineIntegration")(
  (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => SquadGroupStoreService.use((store) => store.getSquadGroupDetail(input))
);
