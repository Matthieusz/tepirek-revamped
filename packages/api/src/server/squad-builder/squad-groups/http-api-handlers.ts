/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { SquadGroupListFilterError } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import { parseSquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import type { SquadBuilderSquadGroupError } from "../../../protocol/squad-builder/squad-groups/http-api-contract.ts";
import {
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/squad-groups/http-api-contract.ts";
import { logSquadBuilderInternalFailure } from "../../../services/squad-builder/internal-error-logging.ts";
import type { CreateSquadGroupError } from "../../../services/squad-builder/squad-groups/create-squad-group.ts";
import { CreateSquadGroupService } from "../../../services/squad-builder/squad-groups/create-squad-group.ts";
import { ListGlobalSquadGroupsService } from "../../../services/squad-builder/squad-groups/list-global-squad-groups.ts";
import type {
  GetSquadGroupDetailError,
  ListMySquadGroupsError,
} from "../../../services/squad-builder/squad-groups/list-squad-groups.ts";
import { ListSquadGroupsService } from "../../../services/squad-builder/squad-groups/list-squad-groups.ts";
import type { EffectSharedSquadGroupSaveError } from "../../../services/squad-builder/squad-groups/save-shared-squad-group-characters.ts";
import { SaveSharedSquadGroupCharactersService } from "../../../services/squad-builder/squad-groups/save-shared-squad-group-characters.ts";
import type { SaveSquadGroupError } from "../../../services/squad-builder/squad-groups/save-squad-group.ts";
import { SaveSquadGroupService } from "../../../services/squad-builder/squad-groups/save-squad-group.ts";
import type { GlobalSquadVisibilityError } from "../../../services/squad-builder/squad-groups/set-squad-group-visibility.ts";
import { SetSquadGroupVisibilityService } from "../../../services/squad-builder/squad-groups/set-squad-group-visibility.ts";
import { SquadGroupStoreService } from "../../../services/squad-builder/squad-groups/squad-group-store.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderSquadGroupError>;

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

type SquadGroupsHandlerError =
  | CreateSquadGroupError
  | ListMySquadGroupsError
  | GetSquadGroupDetailError
  | SaveSquadGroupError
  | EffectSharedSquadGroupSaveError
  | GlobalSquadVisibilityError
  | SquadGroupListFilterError;

const mapSquadGroupsError = (error: SquadGroupsHandlerError): ProtocolError => {
  switch (error._tag) {
    case "SquadGroupNotFound": {
      return new SquadBuilderNotFound({ message: error._tag });
    }
    case "ActorDoesNotOwnSquadGroup":
    case "ActorCannotViewSquadGroup":
    case "ActorCannotEditSquadGroup":
    case "EditorCannotChangeSquadStructure":
    case "SquadCharacterNotAccessible": {
      return new SquadBuilderForbidden({ message: error._tag });
    }
    case "SquadNotInGroup":
    case "InvalidSquadGroupName":
    case "InvalidSquadName":
    case "InvalidSquadGroupVisibility":
    case "TooManyCharactersInSquad":
    case "DuplicateCharacterInSquad":
    case "DuplicateAccountInSquad":
    case "DuplicateCharacterInSquadGroup":
    case "SquadCharacterNotJaruna":
    case "InvalidSquadSnapshot":
    case "InvalidSquadGroupNameQuery":
    case "InvalidSquadGroupLevelRange": {
      return new SquadBuilderInvalidInput({ message: error._tag });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new SquadBuilderPersistenceUnavailable({
        operation: error.operation,
      });
    }
    default: {
      return new SquadBuilderUpstreamUnavailable({
        message: "Unreachable error tag",
      });
    }
  }
};

export const SquadBuilderSquadGroupHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderSquadGroup",
  (handlers) =>
    Effect.gen(function* SquadBuilderSquadGroupHttpApiHandlers() {
      const createSquadGroupSvc = yield* CreateSquadGroupService;
      const listSquadGroupsSvc = yield* ListSquadGroupsService;
      const listGlobalSquadGroupsSvc = yield* ListGlobalSquadGroupsService;
      const saveSquadGroupSvc = yield* SaveSquadGroupService;
      const saveSharedCharactersSvc =
        yield* SaveSharedSquadGroupCharactersService;
      const setVisibilitySvc = yield* SetSquadGroupVisibilityService;

      return handlers
        .handle("createSquadGroup", ({ payload, request }) =>
          Effect.gen(function* createSquadGroupHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              createSquadGroupSvc.create({
                actorUserId: sessionAppUserId(session),
                name: payload.name,
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapSquadGroupsError)
            );
          })
        )
        .handle("listOwnedSquadGroups", ({ request }) =>
          Effect.gen(function* listOwnedSquadGroupsHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              listSquadGroupsSvc.listMine({
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapSquadGroupsError)
            );
          })
        )
        .handle("listGlobalSquadGroups", ({ payload, request }) =>
          Effect.gen(function* listGlobalSquadGroupsHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              Effect.gen(function* listGlobalSquadGroupsEffect() {
                const filters = yield* parseSquadGroupListFilters({
                  maxLevel: payload.maxLevel,
                  minLevel: payload.minLevel,
                  nameQuery: payload.nameQuery,
                });

                return yield* listGlobalSquadGroupsSvc.list({
                  actorUserId: sessionAppUserId(session),
                  filters,
                });
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapSquadGroupsError)
            );
          })
        )
        .handle("getSquadGroupDetail", ({ payload, request }) =>
          Effect.gen(function* getSquadGroupDetailHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              SquadGroupStoreService.use((store) =>
                store.getSquadGroupDetail({
                  actorUserId: sessionAppUserId(session),
                  groupId: payload.groupId,
                })
              )
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapSquadGroupsError)
            );
          })
        )
        .handle("listAvailableSquadCharacters", ({ payload, request }) =>
          Effect.gen(function* listAvailableSquadCharactersHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              Effect.gen(function* listAvailableSquadCharacters() {
                const detail = yield* SquadGroupStoreService.use((store) =>
                  store.getSquadGroupDetail({
                    actorUserId: sessionAppUserId(session),
                    groupId: payload.groupId,
                  })
                );
                return yield* SquadGroupStoreService.use((store) =>
                  store.listAvailableCharactersForOwner({
                    ownerUserId: detail.ownerUserId,
                  })
                );
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapSquadGroupsError)
            );
          })
        )
        .handle("saveSquadGroup", ({ payload, request }) =>
          Effect.gen(function* saveSquadGroupHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              saveSquadGroupSvc.save({
                actorUserId: sessionAppUserId(session),
                groupId: payload.groupId,
                name: payload.name,
                squads: payload.squads.map((squad) => ({
                  characters: squad.characters,
                  clientKey: squad.clientKey,
                  name: squad.name,
                  position: squad.position,
                  ...(squad.squadId === undefined
                    ? {}
                    : { squadId: squad.squadId }),
                })),
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapSquadGroupsError)
            );
          })
        )
        .handle("saveSharedSquadGroupCharacters", ({ payload, request }) =>
          Effect.gen(function* saveSharedSquadGroupCharactersHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              saveSharedCharactersSvc.saveWithStoreService({
                actorUserId: sessionAppUserId(session),
                groupId: payload.groupId,
                squads: payload.squads.map((squad) => ({
                  characters: squad.characters,
                  squadId: squad.squadId,
                })),
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapSquadGroupsError)
            );
          })
        )
        .handle("setSquadGroupVisibility", ({ payload, request }) =>
          Effect.gen(function* setSquadGroupVisibilityHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              setVisibilitySvc.set({
                actorUserId: sessionAppUserId(session),
                groupId: payload.groupId,
                visibility: payload.visibility,
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapSquadGroupsError)
            );
          })
        );
    })
);
