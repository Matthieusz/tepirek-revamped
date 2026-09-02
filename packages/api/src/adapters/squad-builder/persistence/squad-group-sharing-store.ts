import { EffectDatabase } from "@tepirek-revamped/db/effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SquadGroupSharingStoreService } from "../../../services/squad-builder/squad-groups/squad-group-sharing-store.ts";
import {
  respondToSquadGroupInviteWithDatabase,
  revokeSquadGroupEditorWithDatabase,
  saveSharedSquadGroupCharactersWithDatabase,
  upsertSquadGroupEditorInviteWithDatabase,
} from "./squad-group-sharing-commands.ts";
import {
  authorizeSquadGroupOwnerWithDatabase,
  getPendingSquadGroupInviteCountWithDatabase,
  listIncomingSquadGroupInvitesWithDatabase,
  listSharedSquadGroupsWithDatabase,
  listSquadGroupEditorGrantsWithDatabase,
} from "./squad-group-sharing-queries.ts";

/** Provide the squad-group sharing store with its Drizzle implementation. */
const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

export const DrizzleSquadGroupSharingStoreServiceLayer = Layer.effect(
  SquadGroupSharingStoreService,
  getDatabaseSync((database) =>
    SquadGroupSharingStoreService.of({
      authorizeSquadGroupOwner: Effect.fn(
        "SquadGroupSharingStore.authorizeSquadGroupOwner"
      )(authorizeSquadGroupOwnerWithDatabase(database)),
      getPendingSquadGroupInviteCount: Effect.fn(
        "SquadGroupSharingStore.getPendingSquadGroupInviteCount"
      )(getPendingSquadGroupInviteCountWithDatabase(database)),
      listIncomingSquadGroupInvites: Effect.fn(
        "SquadGroupSharingStore.listIncomingSquadGroupInvites"
      )(listIncomingSquadGroupInvitesWithDatabase(database)),
      listSharedSquadGroups: Effect.fn(
        "SquadGroupSharingStore.listSharedSquadGroups"
      )(listSharedSquadGroupsWithDatabase(database)),
      listSquadGroupEditorGrants: Effect.fn(
        "SquadGroupSharingStore.listSquadGroupEditorGrants"
      )(listSquadGroupEditorGrantsWithDatabase(database)),
      respondToSquadGroupInvite: Effect.fn(
        "SquadGroupSharingStore.respondToSquadGroupInvite"
      )(respondToSquadGroupInviteWithDatabase(database)),
      revokeSquadGroupEditor: Effect.fn(
        "SquadGroupSharingStore.revokeSquadGroupEditor"
      )(revokeSquadGroupEditorWithDatabase(database)),
      saveSharedSquadGroupCharacters: Effect.fn(
        "SquadGroupSharingStore.saveSharedSquadGroupCharacters"
      )(saveSharedSquadGroupCharactersWithDatabase(database)),
      upsertSquadGroupEditorInvite: Effect.fn(
        "SquadGroupSharingStore.upsertSquadGroupEditorInvite"
      )(upsertSquadGroupEditorInviteWithDatabase(database)),
    })
  )
);
