import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { emptySquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.js";
import type { ListSquadGroupSharingState } from "./list-squad-group-sharing-state.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { SquadGroupStoreService } from "./squad-group-store.js";
import type {
  SharedSquadGroupSummary,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
} from "./squad-group-store.js";

export interface Interface {
  /** List pending squad group editor invites received by the actor. */
  readonly listIncomingInvites: (
    input: Parameters<ListSquadGroupSharingState["listIncomingInvites"]>[0]
  ) => Effect<readonly SquadGroupInvitationSummary[], SquadGroupSharingError>;

  /** List squad groups shared with the actor as accepted editor. */
  readonly listSharedGroups: (
    input: Parameters<ListSquadGroupSharingState["listSharedGroups"]>[0]
  ) => Effect<readonly SharedSquadGroupSummary[], SquadGroupSharingError>;

  /** List pending and accepted editor grants for an owned squad group. */
  readonly listEditorGrants: (
    input: Parameters<ListSquadGroupSharingState["listEditorGrants"]>[0]
  ) => Effect<readonly SquadGroupEditorGrantSummary[], SquadGroupSharingError>;

  /** Count pending squad group editor invites received by the actor. */
  readonly countPendingInvites: (
    input: Parameters<ListSquadGroupSharingState["countPendingInvites"]>[0]
  ) => Effect<number, SquadGroupSharingError>;
}

/** Service module that reads squad group sharing state for the actor. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SquadGroupSharingState"
) {}

export const layer = Layer.effect(
  Service,
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
