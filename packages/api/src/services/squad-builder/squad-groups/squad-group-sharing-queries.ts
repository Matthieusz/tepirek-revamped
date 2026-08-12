import * as Effect from "effect/Effect";

import { SquadGroupSharingStoreService } from "./squad-group-sharing-store.ts";

/** List invitations addressed to the current application user. */
export const listIncomingSquadGroupInvites = Effect.fn(
  "SquadGroupSharing.listIncomingInvites"
)(function* listIncomingSquadGroupInvites(
  input: Parameters<
    (typeof SquadGroupSharingStoreService.Service)["listIncomingSquadGroupInvites"]
  >[0]
) {
  const store = yield* SquadGroupSharingStoreService;
  return yield* store.listIncomingSquadGroupInvites(input);
});

/** List squad groups shared with the current application user. */
export const listSharedSquadGroups = Effect.fn("SquadGroupSharing.listShared")(
  function* listSharedSquadGroups(
    input: Parameters<
      (typeof SquadGroupSharingStoreService.Service)["listSharedSquadGroups"]
    >[0]
  ) {
    const store = yield* SquadGroupSharingStoreService;
    return yield* store.listSharedSquadGroups(input);
  }
);

/** List editor grants for one squad group. */
export const listSquadGroupEditorGrants = Effect.fn(
  "SquadGroupSharing.listEditorGrants"
)(function* listSquadGroupEditorGrants(
  input: Parameters<
    (typeof SquadGroupSharingStoreService.Service)["listSquadGroupEditorGrants"]
  >[0]
) {
  const store = yield* SquadGroupSharingStoreService;
  return yield* store.listSquadGroupEditorGrants(input);
});

/** Count pending invitations for the current application user. */
export const countPendingSquadGroupInvites = Effect.fn(
  "SquadGroupSharing.countPendingInvites"
)(function* countPendingSquadGroupInvites(
  input: Parameters<
    (typeof SquadGroupSharingStoreService.Service)["getPendingSquadGroupInviteCount"]
  >[0]
) {
  const store = yield* SquadGroupSharingStoreService;
  return yield* store.getPendingSquadGroupInviteCount(input);
});
