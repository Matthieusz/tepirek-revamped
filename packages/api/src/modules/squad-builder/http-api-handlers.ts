import * as Effect from "effect/Effect";
import type { Effect as EffectType } from "effect/Effect";
import * as Layer from "effect/Layer";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../http-api-contract.js";
import { EffectConfirmOwnedAccountImport } from "./account-import/effect-confirm-owned-account-import.js";
import { EffectPreviewMargonemProfileImport } from "./account-import/effect-preview-margonem-profile-import.js";
import { EffectPreviewOwnedAccountImports } from "./account-import/effect-preview-owned-account-imports.js";
import { EffectApplyAccountRefetch } from "./account-refetch/effect-apply-account-refetch.js";
import { EffectPreviewAccountRefetch } from "./account-refetch/effect-preview-account-refetch.js";
import {
  layer as accountSharingStateLayer,
  use as accountSharingState,
} from "./account-sharing/effect-list-account-sharing-state.js";
import {
  layer as accountAccessInviteResponsesLayer,
  use as accountAccessInviteResponses,
} from "./account-sharing/effect-respond-to-account-access-invite.js";
import {
  layer as accountAccessRevocationsLayer,
  use as accountAccessRevocations,
} from "./account-sharing/effect-revoke-account-access.js";
import {
  layer as accountInviteTargetsLayer,
  use as accountInviteTargets,
} from "./account-sharing/effect-search-account-invite-targets.js";
import {
  layer as accountAccessInvitesLayer,
  use as accountAccessInvites,
} from "./account-sharing/effect-send-account-access-invite.js";
import type { AppUserId } from "./app-user-id.js";
import type { MargonemAccountAccessId } from "./margonem-account-access-id.js";
import type { MargonemAccountId } from "./margonem-account-id.js";
import type { PendingMargonemAccountImportId } from "./pending-margonem-account-import-id.js";
import type { PendingMargonemAccountRefetchId } from "./pending-margonem-account-refetch-id.js";
import type { SquadGroupId } from "./squad-group-id.js";
import type { SquadGroupInvitationId } from "./squad-group-invitation-id.js";
import {
  layer as squadGroupSharingStateLayer,
  use as squadGroupSharingState,
} from "./squad-groups/effect-list-squad-group-sharing-state.js";
import {
  layer as squadGroupEditorInviteResponsesLayer,
  use as squadGroupEditorInviteResponses,
} from "./squad-groups/effect-respond-to-squad-group-invite.js";
import {
  layer as squadGroupEditorRevocationsLayer,
  use as squadGroupEditorRevocations,
} from "./squad-groups/effect-revoke-squad-group-editor.js";
import {
  layer as squadEditorInviteTargetsLayer,
  use as squadEditorInviteTargets,
} from "./squad-groups/effect-search-squad-editor-invite-targets.js";
import {
  layer as squadGroupEditorInvitesLayer,
  use as squadGroupEditorInvites,
} from "./squad-groups/effect-send-squad-group-editor-invite.js";

const toAppUserId = (value: string): AppUserId =>
  // SAFETY: HttpApi decoded this value with AppUserIdSchema before the handler runs.
  value as AppUserId;

const toMargonemAccountId = (value: number): MargonemAccountId =>
  // SAFETY: HttpApi decoded this value with MargonemAccountIdSchema before the handler runs.
  value as MargonemAccountId;

const toMargonemAccountAccessId = (value: number): MargonemAccountAccessId =>
  // SAFETY: HttpApi decoded this value with MargonemAccountAccessIdSchema before the handler runs.
  value as MargonemAccountAccessId;

const toPendingImportId = (value: number): PendingMargonemAccountImportId =>
  // SAFETY: HttpApi decoded this value with PendingMargonemAccountImportIdSchema before the handler runs.
  value as PendingMargonemAccountImportId;

const toPendingRefetchId = (value: number): PendingMargonemAccountRefetchId =>
  // SAFETY: HttpApi decoded this value with PendingMargonemAccountRefetchIdSchema before the handler runs.
  value as PendingMargonemAccountRefetchId;

const toSquadGroupId = (value: number): SquadGroupId =>
  // SAFETY: HttpApi decoded this value with SquadGroupIdSchema before the handler runs.
  value as SquadGroupId;

const toSquadGroupInvitationId = (value: number): SquadGroupInvitationId =>
  // SAFETY: HttpApi decoded this value with SquadGroupInvitationIdSchema before the handler runs.
  value as SquadGroupInvitationId;

const withRequestCorrelation = <A, E, R>(
  request: HttpServerRequest,
  effect: EffectType<A, E, R>
): EffectType<A, E, R> => {
  const requestId = request.headers["x-request-id"];

  if (requestId === undefined || requestId.length === 0) {
    return effect;
  }

  return effect.pipe(
    Effect.tap(() => Effect.annotateCurrentSpan("request.id", requestId))
  );
};

const accountImportHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountImport",
  (handlers) => {
    const previewProfile = new EffectPreviewMargonemProfileImport();
    const previewOwned = new EffectPreviewOwnedAccountImports();
    const confirmOwned = new EffectConfirmOwnedAccountImport();

    return handlers
      .handle("previewMargonemProfileImport", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          previewProfile.preview({
            actorUserId: toAppUserId(payload.actorUserId),
            profileUrl: payload.profileUrl,
          })
        )
      )
      .handle("previewOwnedAccountImports", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          previewOwned.preview({
            actorUserId: toAppUserId(payload.actorUserId),
            profileUrls: payload.profileUrls,
          })
        )
      )
      .handle("confirmOwnedAccountImport", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          confirmOwned.confirm({
            actorUserId: toAppUserId(payload.actorUserId),
            displayName: payload.displayName,
            pendingImportId: toPendingImportId(payload.pendingImportId),
          })
        )
      );
  }
);

const accountRefetchHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountRefetch",
  (handlers) => {
    const previewRefetch = new EffectPreviewAccountRefetch();
    const applyRefetch = new EffectApplyAccountRefetch();

    return handlers
      .handle("previewAccountRefetch", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          previewRefetch.preview({
            accountId: toMargonemAccountId(payload.accountId),
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("applyAccountRefetch", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          applyRefetch.apply({
            actorUserId: toAppUserId(payload.actorUserId),
            refetchPreviewId: toPendingRefetchId(payload.refetchPreviewId),
          })
        )
      );
  }
);

const accountSharingHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountSharing",
  (handlers) =>
    handlers
      .handle("searchAccountInviteTargets", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          accountInviteTargets.search({
            accountId: toMargonemAccountId(payload.accountId),
            actorUserId: toAppUserId(payload.actorUserId),
            query: payload.query,
          })
        )
      )
      .handle("sendAccountAccessInvite", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          accountAccessInvites.send({
            accountId: toMargonemAccountId(payload.accountId),
            actorUserId: toAppUserId(payload.actorUserId),
            invitedUserId: toAppUserId(payload.invitedUserId),
          })
        )
      )
      .handle("respondToAccountAccessInvite", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          accountAccessInviteResponses.respond({
            accessId: toMargonemAccountAccessId(payload.accessId),
            actorUserId: toAppUserId(payload.actorUserId),
            response: payload.response,
          })
        )
      )
      .handle("revokeAccountAccess", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          accountAccessRevocations.revoke({
            accessId: toMargonemAccountAccessId(payload.accessId),
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("listIncomingAccountInvites", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          accountSharingState.listIncomingInvites({
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("listSharedAccounts", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          accountSharingState.listSharedAccounts({
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("listAccountAccessGrants", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          accountSharingState.listAccountAccessGrants({
            accountId: toMargonemAccountId(payload.accountId),
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
);

const squadGroupSharingHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderSquadGroupSharing",
  (handlers) =>
    handlers
      .handle("searchSquadEditorInviteTargets", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadEditorInviteTargets.search({
            actorUserId: toAppUserId(payload.actorUserId),
            groupId: toSquadGroupId(payload.groupId),
            query: payload.query,
          })
        )
      )
      .handle("sendSquadGroupEditorInvite", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupEditorInvites.send({
            actorUserId: toAppUserId(payload.actorUserId),
            groupId: toSquadGroupId(payload.groupId),
            invitedUserId: toAppUserId(payload.invitedUserId),
          })
        )
      )
      .handle("respondToSquadGroupInvite", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupEditorInviteResponses.respond({
            actorUserId: toAppUserId(payload.actorUserId),
            invitationId: toSquadGroupInvitationId(payload.invitationId),
            response: payload.response,
          })
        )
      )
      .handle("revokeSquadGroupEditor", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupEditorRevocations.revoke({
            actorUserId: toAppUserId(payload.actorUserId),
            invitationId: toSquadGroupInvitationId(payload.invitationId),
          })
        )
      )
      .handle("listIncomingSquadGroupInvites", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupSharingState.listIncomingInvites({
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("listSharedSquadGroups", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupSharingState.listSharedGroups({
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("listSquadGroupEditorGrants", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupSharingState.listEditorGrants({
            actorUserId: toAppUserId(payload.actorUserId),
            groupId: toSquadGroupId(payload.groupId),
          })
        )
      )
      .handle("countPendingSquadGroupInvites", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupSharingState.countPendingInvites({
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
);

export const SquadBuilderHttpApiHandlers = Layer.mergeAll(
  accountImportHandlers,
  accountRefetchHandlers,
  accountSharingHandlers,
  squadGroupSharingHandlers
).pipe(
  Layer.provide(
    Layer.mergeAll(
      accountInviteTargetsLayer,
      accountAccessInvitesLayer,
      accountAccessInviteResponsesLayer,
      accountAccessRevocationsLayer,
      accountSharingStateLayer,
      squadEditorInviteTargetsLayer,
      squadGroupEditorInvitesLayer,
      squadGroupEditorInviteResponsesLayer,
      squadGroupEditorRevocationsLayer,
      squadGroupSharingStateLayer
    )
  )
);
