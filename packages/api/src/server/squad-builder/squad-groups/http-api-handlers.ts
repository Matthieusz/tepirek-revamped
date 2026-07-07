/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import { parseSquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.js";
import type { SquadId } from "../../../domain/squad-builder/squad-id.js";
import { AppHttpApi } from "../../../protocol/http-api-contract.js";
import type { SquadBuilderSquadGroupError } from "../../../protocol/squad-builder/squad-groups/http-api-contract.js";
import {
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderConflict,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/squad-groups/http-api-contract.js";
import {
  layer as createSquadGroupLayer,
  use as createSquadGroup,
} from "../../../services/squad-builder/squad-groups/create-squad-group.js";
import {
  layer as listGlobalSquadGroupsLayer,
  use as listGlobalSquadGroups,
} from "../../../services/squad-builder/squad-groups/list-global-squad-groups.js";
import {
  layer as listSquadGroupsLayer,
  use as listSquadGroups,
} from "../../../services/squad-builder/squad-groups/list-squad-groups.js";
import {
  layer as saveSharedSquadGroupCharactersLayer,
  use as saveSharedSquadGroupCharacters,
} from "../../../services/squad-builder/squad-groups/save-shared-squad-group-characters.js";
import {
  layer as saveSquadGroupLayer,
  use as saveSquadGroup,
} from "../../../services/squad-builder/squad-groups/save-squad-group.js";
import {
  layer as setSquadGroupVisibilityLayer,
  use as setSquadGroupVisibility,
} from "../../../services/squad-builder/squad-groups/set-squad-group-visibility.js";
import { SquadGroupStoreService } from "../../../services/squad-builder/squad-groups/squad-group-store.js";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderSquadGroupError>;

const toAppUserId = (value: string): AppUserId =>
  // SAFETY: HttpApi decoded this value with AppUserIdSchema before the handler runs.
  value as AppUserId;

const toSquadGroupId = (value: number): SquadGroupId =>
  // SAFETY: HttpApi decoded this value with SquadGroupIdSchema before the handler runs.
  value as SquadGroupId;

const toSquadId = (value: number): SquadId =>
  // SAFETY: HttpApi decoded this value with PositiveInt before the handler runs.
  value as SquadId;

const withRequestCorrelation = <A, E, R>(
  request: HttpServerRequest,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  const requestId = request.headers["x-request-id"];

  if (requestId === undefined || requestId.length === 0) {
    return effect;
  }

  return effect.pipe(
    Effect.tap(() => Effect.annotateCurrentSpan("request.id", requestId))
  );
};

const notFoundTags = new Set([
  "SquadGroupNotFound",
  "SquadGroupInvitationNotFound",
  "MargonemAccountNotFound",
  "InviteTargetNotFound",
  "AccountAccessInviteNotFound",
  "PendingMargonemAccountImportNotFound",
  "PendingMargonemAccountRefetchNotFound",
  "SquadEditorInviteTargetNotFound",
  "SquadGroupNotFoundError",
]);

const forbiddenTags = new Set([
  "ActorDoesNotOwnSquadGroup",
  "ActorCannotViewSquadGroup",
  "ActorCannotEditSquadGroup",
  "ActorIsNotSquadGroupInviteRecipient",
  "SquadEditorInviteTargetNotVerified",
  "EditorCannotChangeSquadStructure",
  "SquadCharacterNotAccessible",
  "ActorDoesNotOwnMargonemAccount",
  "InviteTargetNotVerified",
  "ActorIsNotInviteRecipient",
  "ActorDoesNotOwnMargonemAccount",
  "ActorDoesNotOwnSquadGroup",
]);

const conflictTags = new Set([
  "SquadGroupInvitationTransitionNotAllowed",
  "AccountAccessTransitionNotAllowed",
]);

const invalidInputTags = new Set([
  "CannotInviteSelf",
  "SquadNotInGroup",
  "InvalidSquadGroupName",
  "InvalidSquadName",
  "SquadGroupValidationError",
  "InvalidSquadGroupVisibility",
  "InvalidAppUserId",
  "InvalidSquadGroupId",
  "InvalidSquadGroupInvitationId",
  "InvalidSquadId",
  "InvalidMargonemAccountId",
  "InvalidMargonemAccountAccessId",
  "InvalidAccountInviteTargetQuery",
]);

const toSquadBuilderFail = (
  error: unknown
): Effect.Effect<never, ProtocolError, never> => {
  if (typeof error !== "object" || error === null || !("_tag" in error)) {
    return Effect.fail(
      new SquadBuilderUpstreamUnavailable({ message: "Unknown error" })
    );
  }

  const tagged = error as { _tag: string; cause?: unknown; operation?: string };

  if (tagged._tag === "SquadBuilderPersistenceUnavailable") {
    return Effect.fail(
      new SquadBuilderPersistenceUnavailable({
        cause: tagged.cause,
        operation: tagged.operation ?? "unknown",
      })
    );
  }

  if (notFoundTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderNotFound({ message: tagged._tag }));
  }

  if (forbiddenTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderForbidden({ message: tagged._tag }));
  }

  if (conflictTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderConflict({ message: tagged._tag }));
  }

  if (invalidInputTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderInvalidInput({ message: tagged._tag }));
  }

  return Effect.fail(
    new SquadBuilderUpstreamUnavailable({
      message: `Unknown error: ${tagged._tag}`,
    })
  );
};

// oxlint-disable-next-line promise/valid-params, promise/prefer-await-to-then, promise/prefer-await-to-callbacks
const withErrorMapping = <A, R>(
  self: Effect.Effect<A, unknown, R>
): Effect.Effect<A, ProtocolError, R> =>
  Effect.catch(
    self as Effect.Effect<A, unknown, never>,
    (error) => toSquadBuilderFail(error)
    // SAFETY: The protocol error type matches what HttpApi expects because the
    // error union includes all error classes handled in toSquadBuilderFail.
  ) as unknown as Effect.Effect<A, ProtocolError, R>;
// oxlint-enable promise/valid-params, promise/prefer-await-to-then, promise/prefer-await-to-callbacks

export const SquadBuilderSquadGroupHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderSquadGroup",
  (handlers) =>
    handlers
      .handle("createSquadGroup", ({ payload, request }) =>
        withErrorMapping(
          withRequestCorrelation(
            request,
            createSquadGroup.create({
              actorUserId: toAppUserId(payload.actorUserId),
              name: payload.name,
            })
          )
        )
      )
      .handle("listOwnedSquadGroups", ({ payload, request }) =>
        withErrorMapping(
          withRequestCorrelation(
            request,
            listSquadGroups.listMine({
              actorUserId: toAppUserId(payload.actorUserId),
            })
          )
        )
      )
      .handle("listGlobalSquadGroups", ({ payload, request }) =>
        withErrorMapping(
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
      )
      .handle("getSquadGroupDetail", ({ payload, request }) =>
        withErrorMapping(
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
      )
      .handle("listAvailableSquadCharacters", ({ payload, request }) =>
        withErrorMapping(
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
      )
      .handle("saveSquadGroup", ({ payload, request }) =>
        withErrorMapping(
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
      )
      .handle("saveSharedSquadGroupCharacters", ({ payload, request }) =>
        withErrorMapping(
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
      )
      .handle("setSquadGroupVisibility", ({ payload, request }) =>
        withErrorMapping(
          withRequestCorrelation(
            request,
            setSquadGroupVisibility.set({
              actorUserId: toAppUserId(payload.actorUserId),
              groupId: toSquadGroupId(payload.groupId),
              visibility: payload.visibility,
            })
          )
        )
      )
).pipe(
  Layer.provide(
    Layer.mergeAll(
      createSquadGroupLayer,
      listSquadGroupsLayer,
      listGlobalSquadGroupsLayer,
      saveSquadGroupLayer,
      saveSharedSquadGroupCharactersLayer,
      setSquadGroupVisibilityLayer
    )
  )
);
