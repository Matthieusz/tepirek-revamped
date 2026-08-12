import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";

import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { parseSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { parseSquadGroupInvitationStatus } from "../../../domain/squad-builder/squad-group-invitation-status.ts";
import { SquadGroupInvitationNotFound } from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import type { EffectSquadGroupPersistenceOperation } from "./persistence-query.ts";
import {
  failPersistence,
  parsePersistedAppUserId,
  parsePersistedSquadGroupName,
  persistenceQuery,
} from "./persistence-query.ts";

/** Load the squad-group invitation read model used after a mutation. */
export const loadSquadGroupInvitationSummaryWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* loadSquadGroupInvitationSummaryEffect(
    invitationId: SquadGroupInvitationId,
    operation: EffectSquadGroupPersistenceOperation
  ) {
    const select = database
      .select({
        createdAt: squadGroupInvitation.createdAt,
        invitationId: squadGroupInvitation.id,
        ownerId: user.id,
        ownerImage: user.image,
        ownerName: user.name,
        squadGroupId: squadGroup.id,
        squadGroupName: squadGroup.name,
        status: squadGroupInvitation.status,
        updatedAt: squadGroupInvitation.updatedAt,
      })
      .from(squadGroupInvitation)
      .innerJoin(
        squadGroup,
        eq(squadGroup.id, squadGroupInvitation.squadGroupId)
      )
      .innerJoin(user, eq(user.id, squadGroup.ownerUserId))
      .where(eq(squadGroupInvitation.id, invitationId))
      .limit(1);
    const rows = yield* persistenceQuery(operation, select);

    const [row] = rows;

    if (row === undefined) {
      return yield* new SquadGroupInvitationNotFound();
    }

    const status = yield* parseSquadGroupInvitationStatus(row.status).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const persistedInvitationId = yield* parseSquadGroupInvitationId(
      row.invitationId
    ).pipe(Effect.catch((error) => failPersistence(operation, error)));

    const persistedGroupId = yield* parseSquadGroupId(row.squadGroupId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const squadGroupName = yield* parsePersistedSquadGroupName(
      operation,
      row.squadGroupName
    );
    const ownerUserId = yield* parsePersistedAppUserId(operation, row.ownerId);

    return {
      createdAt: row.createdAt,
      invitationId: persistedInvitationId,
      ownerUserId,
      ownerUserImage: row.ownerImage,
      ownerUserName: row.ownerName,
      squadGroupId: persistedGroupId,
      squadGroupName,
      status,
      updatedAt: row.updatedAt,
    };
  });
