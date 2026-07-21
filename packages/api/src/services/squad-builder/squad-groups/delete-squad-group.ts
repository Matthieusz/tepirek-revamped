import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type {
  EffectSquadBuilderPersistenceUnavailable,
  ActorDoesNotOwnSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-errors.ts";
import * as SquadGroupStore from "./squad-group-store.ts";

/** Input for permanently deleting a squad group. */
export interface DeleteSquadGroupInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Expected failures returned by squad group deletion. */
export type DeleteSquadGroupError =
  | SquadGroupNotFound
  | ActorDoesNotOwnSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

const makeDelete = (store: SquadGroupStore.SquadGroupStoreServiceShape) =>
  Effect.fn("SquadGroups.delete")(function* deleteSquadGroup(
    input: DeleteSquadGroupInput
  ) {
    yield* store.deleteSquadGroup(input);
  });

export interface DeleteSquadGroup {
  readonly delete: ReturnType<typeof makeDelete>;
}

export class DeleteSquadGroupService extends Context.Service<
  DeleteSquadGroupService,
  DeleteSquadGroup
>()("@tepirek-revamped/api/squad-builder/DeleteSquadGroupService") {}

export const layer = Layer.effect(
  DeleteSquadGroupService,
  Effect.gen(function* layer() {
    const store = yield* SquadGroupStore.SquadGroupStoreService;
    return DeleteSquadGroupService.of({ delete: makeDelete(store) });
  })
);
