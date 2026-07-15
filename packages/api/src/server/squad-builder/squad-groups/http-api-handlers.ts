/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { SquadGroupListFilterError } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import { parseSquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import type { SquadBuilderSquadGroupError } from "../../../protocol/squad-builder/squad-groups/http-api-contract.ts";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../../../protocol/squad-builder/squad-groups/http-api-contract.ts";
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
import { withRequestCorrelation } from "../request-correlation.ts";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderSquadGroupError>;

type SquadGroupsHandlerError =
  | CreateSquadGroupError
  | ListMySquadGroupsError
  | GetSquadGroupDetailError
  | SaveSquadGroupError
  | EffectSharedSquadGroupSaveError
  | GlobalSquadVisibilityError
  | SquadGroupListFilterError;

// oxlint-disable-next-line complexity
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
    case "SquadGroupWriteConflict": {
      return new SquadBuilderConflict({ message: error._tag });
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
      const exhaustive: never = error;
      return exhaustive;
    }
  }
};

export const SquadBuilderSquadGroupHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderSquadGroup",
  Effect.fnUntraced(function* SquadBuilderSquadGroupHttpApiHandlers(handlers) {
    const createSquadGroupSvc = yield* CreateSquadGroupService;
    const listSquadGroupsSvc = yield* ListSquadGroupsService;
    const listGlobalSquadGroupsSvc = yield* ListGlobalSquadGroupsService;
    const saveSquadGroupSvc = yield* SaveSquadGroupService;
    const saveSharedCharactersSvc =
      yield* SaveSharedSquadGroupCharactersService;
    const setVisibilitySvc = yield* SetSquadGroupVisibilityService;

    return handlers
      .handle(
        "createSquadGroup",
        Effect.fn("SquadBuilderSquadGroup.createSquadGroup")(
          function* createSquadGroup({ payload, request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              createSquadGroupSvc.create({
                actorUserId: sessionAppUserId(session),
                name: payload.name,
              })
            ).pipe(Effect.mapError(mapSquadGroupsError));
          }
        )
      )
      .handle(
        "listOwnedSquadGroups",
        Effect.fn("SquadBuilderSquadGroup.listOwnedSquadGroups")(
          function* listOwnedSquadGroups({ request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              listSquadGroupsSvc.listMine({
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(Effect.mapError(mapSquadGroupsError));
          }
        )
      )
      .handle(
        "listGlobalSquadGroups",
        Effect.fn("SquadBuilderSquadGroup.listGlobalSquadGroups")(
          function* listGlobalSquadGroups({ payload, request }) {
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
            ).pipe(Effect.mapError(mapSquadGroupsError));
          }
        )
      )
      .handle(
        "getSquadGroupDetail",
        Effect.fn("SquadBuilderSquadGroup.getSquadGroupDetail")(
          function* getSquadGroupDetail({ payload, request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              SquadGroupStoreService.use((store) =>
                store.getSquadGroupDetail({
                  actorUserId: sessionAppUserId(session),
                  groupId: payload.groupId,
                })
              )
            ).pipe(Effect.mapError(mapSquadGroupsError));
          }
        )
      )
      .handle(
        "listAvailableSquadCharacters",
        Effect.fn("SquadBuilderSquadGroup.listAvailableSquadCharacters")(
          function* listAvailableSquadCharacters({ payload, request }) {
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
            ).pipe(Effect.mapError(mapSquadGroupsError));
          }
        )
      )
      .handle(
        "saveSquadGroup",
        Effect.fn("SquadBuilderSquadGroup.saveSquadGroup")(
          function* saveSquadGroup({ payload, request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              saveSquadGroupSvc.save({
                actorUserId: sessionAppUserId(session),
                expectedUpdatedAt: payload.expectedUpdatedAt,
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
            ).pipe(Effect.mapError(mapSquadGroupsError));
          }
        )
      )
      .handle(
        "saveSharedSquadGroupCharacters",
        Effect.fn("SquadBuilderSquadGroup.saveSharedSquadGroupCharacters")(
          function* saveSharedSquadGroupCharacters({ payload, request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              saveSharedCharactersSvc.saveWithStoreService({
                actorUserId: sessionAppUserId(session),
                expectedUpdatedAt: payload.expectedUpdatedAt,
                groupId: payload.groupId,
                squads: payload.squads.map((squad) => ({
                  characters: squad.characters,
                  squadId: squad.squadId,
                })),
              })
            ).pipe(Effect.mapError(mapSquadGroupsError));
          }
        )
      )
      .handle(
        "setSquadGroupVisibility",
        Effect.fn("SquadBuilderSquadGroup.setSquadGroupVisibility")(
          function* setSquadGroupVisibility({ payload, request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              setVisibilitySvc.set({
                actorUserId: sessionAppUserId(session),
                groupId: payload.groupId,
                visibility: payload.visibility,
              })
            ).pipe(Effect.mapError(mapSquadGroupsError));
          }
        )
      );
  })
);
