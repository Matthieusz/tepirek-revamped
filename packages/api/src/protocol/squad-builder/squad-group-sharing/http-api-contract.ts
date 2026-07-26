import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
} from "../errors.ts";
import {
  RespondToSquadGroupInvitePayload,
  RevokeSquadGroupEditorPayload,
  SearchSquadEditorInviteTargetsPayload,
  SendSquadGroupEditorInvitePayload,
  SharedSquadGroupSummarySchema,
  SquadEditorInviteTargetSchema,
  SquadGroupEditorGrantsPayload,
  SquadGroupEditorGrantSummarySchema,
  SquadGroupInvitationSummarySchema,
} from "./squad-group-sharing-schema.ts";

const NoPayload = Schema.Struct({});

export const SearchSquadEditorInviteTargetsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SendSquadGroupEditorInviteErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const RespondToSquadGroupInviteErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderPersistenceUnavailable,
] as const;

export const RevokeSquadGroupEditorErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListIncomingSquadGroupInvitesErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListSharedSquadGroupsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListSquadGroupEditorGrantsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
] as const;

export const CountPendingSquadGroupInvitesErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SquadBuilderSquadGroupSharingGroup = HttpApiGroup.make(
  "squadBuilderSquadGroupSharing"
)
  .add(
    HttpApiEndpoint.post(
      "searchSquadEditorInviteTargets",
      "/editor-targets/search",
      {
        error: SearchSquadEditorInviteTargetsErrors,
        payload: SearchSquadEditorInviteTargetsPayload,
        success: Schema.Array(SquadEditorInviteTargetSchema),
      }
    ),
    HttpApiEndpoint.post("sendSquadGroupEditorInvite", "/editor-invites", {
      error: SendSquadGroupEditorInviteErrors,
      payload: SendSquadGroupEditorInvitePayload,
      success: SquadGroupInvitationSummarySchema,
    }),
    HttpApiEndpoint.post(
      "respondToSquadGroupInvite",
      "/editor-invites/respond",
      {
        error: RespondToSquadGroupInviteErrors,
        payload: RespondToSquadGroupInvitePayload,
        success: SquadGroupInvitationSummarySchema,
      }
    ),
    HttpApiEndpoint.post("revokeSquadGroupEditor", "/editors/revoke", {
      error: RevokeSquadGroupEditorErrors,
      payload: RevokeSquadGroupEditorPayload,
      success: SquadGroupInvitationSummarySchema,
    }),
    HttpApiEndpoint.post("listIncomingSquadGroupInvites", "/incoming-invites", {
      error: ListIncomingSquadGroupInvitesErrors,
      payload: NoPayload,
      success: Schema.Array(SquadGroupInvitationSummarySchema),
    }),
    HttpApiEndpoint.post("listSharedSquadGroups", "/shared-groups", {
      error: ListSharedSquadGroupsErrors,
      payload: NoPayload,
      success: Schema.Array(SharedSquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("listSquadGroupEditorGrants", "/editor-grants", {
      error: ListSquadGroupEditorGrantsErrors,
      payload: SquadGroupEditorGrantsPayload,
      success: Schema.Array(SquadGroupEditorGrantSummarySchema),
    }),
    HttpApiEndpoint.post(
      "countPendingSquadGroupInvites",
      "/pending-invite-count",
      {
        error: CountPendingSquadGroupInvitesErrors,
        payload: NoPayload,
        success: Schema.Finite,
      }
    )
  )
  .prefix("/squad-builder/squad-group-sharing");
