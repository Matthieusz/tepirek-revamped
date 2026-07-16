import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { emptySquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import type { SquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";
import type {
  SharedSquadGroupSummary,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
} from "./squad-group-store.ts";

export interface ListSquadGroupInvitesInput {
  readonly actorUserId: AppUserId;
}

export interface ListSharedSquadGroupsInput {
  readonly actorUserId: AppUserId;
  readonly filters?: SquadGroupListFilters;
}

export interface ListSquadGroupEditorGrantsInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

export interface SquadGroupSharingState {
  /** List pending squad group editor invites received by the actor. */
  readonly listIncomingInvites: (
    input: ListSquadGroupInvitesInput
  ) => Effect<readonly SquadGroupInvitationSummary[], SquadGroupSharingError>;

  /** List squad groups shared with the actor as accepted editor. */
  readonly listSharedGroups: (
    input: ListSharedSquadGroupsInput
  ) => Effect<readonly SharedSquadGroupSummary[], SquadGroupSharingError>;

  /** List pending and accepted editor grants for an owned squad group. */
  readonly listEditorGrants: (
    input: ListSquadGroupEditorGrantsInput
  ) => Effect<readonly SquadGroupEditorGrantSummary[], SquadGroupSharingError>;

  /** Count pending squad group editor invites received by the actor. */
  readonly countPendingInvites: (
    input: ListSquadGroupInvitesInput
  ) => Effect<number, SquadGroupSharingError>;
}

/** Service module that reads squad group sharing state for the actor. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class SquadGroupSharingStateService extends Context.Service<
  SquadGroupSharingStateService,
  SquadGroupSharingState
>()("@tepirek-revamped/api/squad-builder/SquadGroupSharingState") {}

export const layer = Layer.effect(
  SquadGroupSharingStateService,
  EffectRuntime.gen(function* makeSquadGroupSharingStateService() {
    const store = yield* SquadGroupStoreService;

    return {
      countPendingInvites: EffectRuntime.fn(
        "SquadGroupSharingState.countPendingInvites"
      )(function* countPendingInvites(input) {
        return yield* store.getPendingSquadGroupInviteCount({
          actorUserId: input.actorUserId,
        });
      }),
      listEditorGrants: EffectRuntime.fn(
        "SquadGroupSharingState.listEditorGrants"
      )(function* listEditorGrants(input) {
        return yield* store.listSquadGroupEditorGrants({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
        });
      }),
      listIncomingInvites: EffectRuntime.fn(
        "SquadGroupSharingState.listIncomingInvites"
      )(function* listIncomingInvites(input) {
        return yield* store.listIncomingSquadGroupInvites({
          actorUserId: input.actorUserId,
        });
      }),
      listSharedGroups: EffectRuntime.fn(
        "SquadGroupSharingState.listSharedGroups"
      )(function* listSharedGroups(input) {
        return yield* store.listSharedSquadGroups({
          actorUserId: input.actorUserId,
          filters: input.filters ?? emptySquadGroupListFilters,
        });
      }),
    };
  })
);
