import * as Effect from "effect/Effect";
import type { Effect as EffectType } from "effect/Effect";
import * as Layer from "effect/Layer";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.js";
import { AccountImportStoreService } from "./account-import/account-import-store-service.js";
import {
  layer as confirmOwnedAccountImportLayer,
  use as confirmOwnedAccountImport,
} from "./account-import/confirm-owned-account-import-service.js";
import {
  layer as previewMargonemProfileImportLayer,
  use as previewMargonemProfileImport,
} from "./account-import/preview-margonem-profile-import-service.js";
import {
  layer as previewOwnedAccountImportsLayer,
  use as previewOwnedAccountImports,
} from "./account-import/preview-owned-account-imports-service.js";
import {
  layer as applyAccountRefetchLayer,
  use as applyAccountRefetch,
} from "./account-refetch/apply-account-refetch-service.js";
import {
  layer as previewAccountRefetchLayer,
  use as previewAccountRefetch,
} from "./account-refetch/preview-account-refetch-service.js";
import {
  layer as accountSharingStateLayer,
  use as accountSharingState,
} from "./account-sharing/list-account-sharing-state-service.js";
import {
  layer as accountAccessInviteResponsesLayer,
  use as accountAccessInviteResponses,
} from "./account-sharing/respond-to-account-access-invite-service.js";
import {
  layer as accountAccessRevocationsLayer,
  use as accountAccessRevocations,
} from "./account-sharing/revoke-account-access-service.js";
import {
  layer as accountInviteTargetsLayer,
  use as accountInviteTargets,
} from "./account-sharing/search-account-invite-targets-service.js";
import {
  layer as accountAccessInvitesLayer,
  use as accountAccessInvites,
} from "./account-sharing/send-account-access-invite-service.js";
import type { AppUserId } from "./app-user-id.js";
import type { MargonemAccountAccessId } from "./margonem-account-access-id.js";
import type { MargonemAccountId } from "./margonem-account-id.js";
import type { PendingMargonemAccountImportId } from "./pending-margonem-account-import-id.js";
import type { PendingMargonemAccountRefetchId } from "./pending-margonem-account-refetch-id.js";
import type { SquadGroupId } from "./squad-group-id.js";
import type { SquadGroupInvitationId } from "./squad-group-invitation-id.js";
import { parseSquadGroupListFilters } from "./squad-group-list-filters.js";
import {
  layer as createSquadGroupLayer,
  use as createSquadGroup,
} from "./squad-groups/create-squad-group.js";
import {
  layer as listGlobalSquadGroupsLayer,
  use as listGlobalSquadGroups,
} from "./squad-groups/list-global-squad-groups.js";
import {
  layer as squadGroupSharingStateLayer,
  use as squadGroupSharingState,
} from "./squad-groups/list-squad-group-sharing-state-service.js";
import {
  layer as listSquadGroupsLayer,
  use as listSquadGroups,
} from "./squad-groups/list-squad-groups.js";
import {
  layer as squadGroupEditorInviteResponsesLayer,
  use as squadGroupEditorInviteResponses,
} from "./squad-groups/respond-to-squad-group-invite-service.js";
import {
  layer as squadGroupEditorRevocationsLayer,
  use as squadGroupEditorRevocations,
} from "./squad-groups/revoke-squad-group-editor-service.js";
import {
  layer as saveSharedSquadGroupCharactersLayer,
  use as saveSharedSquadGroupCharacters,
} from "./squad-groups/save-shared-squad-group-characters.js";
import {
  layer as saveSquadGroupLayer,
  use as saveSquadGroup,
} from "./squad-groups/save-squad-group.js";
import {
  layer as squadEditorInviteTargetsLayer,
  use as squadEditorInviteTargets,
} from "./squad-groups/search-squad-editor-invite-targets-service.js";
import {
  layer as squadGroupEditorInvitesLayer,
  use as squadGroupEditorInvites,
} from "./squad-groups/send-squad-group-editor-invite-service.js";
import {
  layer as setSquadGroupVisibilityLayer,
  use as setSquadGroupVisibility,
} from "./squad-groups/set-squad-group-visibility.js";
import { SquadGroupStoreService } from "./squad-groups/squad-group-store.js";
import type { SquadId } from "./squad-id.js";

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

const toSquadId = (value: number): SquadId =>
  // SAFETY: HttpApi decoded this value with PositiveInt before the handler runs.
  value as SquadId;

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
  (handlers) =>
    handlers
      .handle("previewMargonemProfileImport", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          previewMargonemProfileImport.preview({
            actorUserId: toAppUserId(payload.actorUserId),
            profileUrl: payload.profileUrl,
          })
        )
      )
      .handle("previewOwnedAccountImports", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          previewOwnedAccountImports.preview({
            actorUserId: toAppUserId(payload.actorUserId),
            profileUrls: payload.profileUrls,
          })
        )
      )
      .handle("confirmOwnedAccountImport", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          confirmOwnedAccountImport.confirm({
            actorUserId: toAppUserId(payload.actorUserId),
            displayName: payload.displayName,
            pendingImportId: toPendingImportId(payload.pendingImportId),
          })
        )
      )
      .handle("listOwnedAccounts", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          AccountImportStoreService.use((store) =>
            store.listOwnedAccounts({
              actorUserId: toAppUserId(payload.actorUserId),
            })
          )
        )
      )
);

const squadGroupHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderSquadGroup",
  (handlers) =>
    handlers
      .handle("createSquadGroup", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          createSquadGroup.create({
            actorUserId: toAppUserId(payload.actorUserId),
            name: payload.name,
          })
        )
      )
      .handle("listOwnedSquadGroups", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          listSquadGroups.listMine({
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("listGlobalSquadGroups", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          Effect.gen(function* listGlobalSquadGroupsEffect() {
            const filters = yield* parseSquadGroupListFilters({
              maxLevel: payload.maxLevel,
              minLevel: payload.minLevel,
              nameQuery: payload.nameQuery,
            });

            return yield* listGlobalSquadGroups.list({
              actorUserId: toAppUserId(payload.actorUserId),
              filters,
            });
          })
        )
      )
      .handle("getSquadGroupDetail", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          SquadGroupStoreService.use((store) =>
            store.getSquadGroupDetail({
              actorUserId: toAppUserId(payload.actorUserId),
              groupId: toSquadGroupId(payload.groupId),
            })
          )
        )
      )
      .handle("listAvailableSquadCharacters", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          Effect.gen(function* listAvailableSquadCharacters() {
            const detail = yield* SquadGroupStoreService.use((store) =>
              store.getSquadGroupDetail({
                actorUserId: toAppUserId(payload.actorUserId),
                groupId: toSquadGroupId(payload.groupId),
              })
            );
            return yield* SquadGroupStoreService.use((store) =>
              store.listAvailableCharactersForOwner({
                ownerUserId: detail.ownerUserId,
              })
            );
          })
        )
      )
      .handle("saveSquadGroup", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          saveSquadGroup.save({
            actorUserId: toAppUserId(payload.actorUserId),
            groupId: toSquadGroupId(payload.groupId),
            name: payload.name,
            squads: payload.squads.map((squad) => ({
              characters: squad.characters,
              clientKey: squad.clientKey,
              name: squad.name,
              position: squad.position,
              ...(squad.squadId === undefined
                ? {}
                : { squadId: toSquadId(squad.squadId) }),
            })),
          })
        )
      )
      .handle("saveSharedSquadGroupCharacters", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          saveSharedSquadGroupCharacters.saveWithStoreService({
            actorUserId: toAppUserId(payload.actorUserId),
            groupId: toSquadGroupId(payload.groupId),
            squads: payload.squads.map((squad) => ({
              characters: squad.characters,
              squadId: toSquadId(squad.squadId),
            })),
          })
        )
      )
      .handle("setSquadGroupVisibility", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          setSquadGroupVisibility.set({
            actorUserId: toAppUserId(payload.actorUserId),
            groupId: toSquadGroupId(payload.groupId),
            visibility: payload.visibility,
          })
        )
      )
);

const accountRefetchHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountRefetch",
  (handlers) =>
    handlers
      .handle("previewAccountRefetch", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          previewAccountRefetch.preview({
            accountId: toMargonemAccountId(payload.accountId),
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("applyAccountRefetch", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          applyAccountRefetch.apply({
            actorUserId: toAppUserId(payload.actorUserId),
            refetchPreviewId: toPendingRefetchId(payload.refetchPreviewId),
          })
        )
      )
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
  squadGroupHandlers,
  accountSharingHandlers,
  squadGroupSharingHandlers
).pipe(
  Layer.provide(
    Layer.mergeAll(
      previewMargonemProfileImportLayer,
      previewOwnedAccountImportsLayer,
      confirmOwnedAccountImportLayer,
      previewAccountRefetchLayer,
      applyAccountRefetchLayer,
      createSquadGroupLayer,
      listSquadGroupsLayer,
      listGlobalSquadGroupsLayer,
      saveSquadGroupLayer,
      saveSharedSquadGroupCharactersLayer,
      setSquadGroupVisibilityLayer,
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
