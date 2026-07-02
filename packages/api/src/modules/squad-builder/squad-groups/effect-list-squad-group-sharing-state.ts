import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import { emptySquadGroupListFilters } from "../squad-group-list-filters";
import type { ListSquadGroupSharingState } from "./list-squad-group-sharing-state";
import type { SquadGroupSharingError } from "./squad-group-sharing-error";
import { EffectSquadGroupStore } from "./squad-group-store";
import type {
  SharedSquadGroupSummary,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
} from "./squad-group-store";

/** Effect service module that reads squad group sharing state for the actor. */
export class EffectListSquadGroupSharingState {
  private readonly serviceName = "EffectListSquadGroupSharingState";

  /** List pending squad group editor invites received by the actor. */
  listIncomingInvites(
    input: Parameters<ListSquadGroupSharingState["listIncomingInvites"]>[0]
  ): Effect<
    readonly SquadGroupInvitationSummary[],
    SquadGroupSharingError,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectRuntime.gen(function* listIncomingSquadGroupInvitesEffect() {
      return yield* EffectSquadGroupStore.use((store) =>
        store.listIncomingSquadGroupInvites({
          actorUserId: input.actorUserId,
        })
      );
    });
  }

  /** List squad groups shared with the actor as accepted editor. */
  listSharedGroups(
    input: Parameters<ListSquadGroupSharingState["listSharedGroups"]>[0]
  ): Effect<
    readonly SharedSquadGroupSummary[],
    SquadGroupSharingError,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectRuntime.gen(function* listSharedSquadGroupsEffect() {
      return yield* EffectSquadGroupStore.use((store) =>
        store.listSharedSquadGroups({
          actorUserId: input.actorUserId,
          filters: input.filters ?? emptySquadGroupListFilters,
        })
      );
    });
  }

  /** List pending and accepted editor grants for an owned squad group. */
  listEditorGrants(
    input: Parameters<ListSquadGroupSharingState["listEditorGrants"]>[0]
  ): Effect<
    readonly SquadGroupEditorGrantSummary[],
    SquadGroupSharingError,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectRuntime.gen(function* listSquadGroupEditorGrantsEffect() {
      return yield* EffectSquadGroupStore.use((store) =>
        store.listSquadGroupEditorGrants({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
        })
      );
    });
  }

  /** Count pending squad group editor invites received by the actor. */
  countPendingInvites(
    input: Parameters<ListSquadGroupSharingState["countPendingInvites"]>[0]
  ): Effect<number, SquadGroupSharingError, EffectSquadGroupStore> {
    void this.serviceName;

    return EffectRuntime.gen(function* getPendingSquadGroupInviteCountEffect() {
      return yield* EffectSquadGroupStore.use((store) =>
        store.getPendingSquadGroupInviteCount({
          actorUserId: input.actorUserId,
        })
      );
    });
  }
}
