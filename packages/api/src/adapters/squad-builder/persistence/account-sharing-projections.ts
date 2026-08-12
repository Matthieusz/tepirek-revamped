import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  margonemAccount,
  margonemAccountAccess,
} from "@tepirek-revamped/db/schema/squad-builder";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";

import { parseAccountAccessStatus } from "../../../domain/squad-builder/account-access-status.ts";
import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import { AccountAccessInviteNotFound } from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import type { EffectSquadGroupPersistenceOperation } from "./persistence-query.ts";
import {
  failPersistence,
  parsePersistedAppUserId,
  persistenceQuery,
} from "./persistence-query.ts";

/** Load the account-access read model used after an invitation mutation. */
export const loadAccountAccessInviteSummaryWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* loadAccountAccessInviteSummaryEffect(
    accessId: MargonemAccountAccessId,
    operation: EffectSquadGroupPersistenceOperation
  ) {
    const select = database
      .select({
        accountDisplayName: margonemAccount.displayName,
        accountId: margonemAccountAccess.accountId,
        createdAt: margonemAccountAccess.createdAt,
        invitedUserId: margonemAccountAccess.userId,
        ownerId: user.id,
        ownerImage: user.image,
        ownerName: user.name,
        profileId: margonemAccount.profileId,
        status: margonemAccountAccess.status,
        updatedAt: margonemAccountAccess.updatedAt,
      })
      .from(margonemAccountAccess)
      .innerJoin(
        margonemAccount,
        eq(margonemAccount.id, margonemAccountAccess.accountId)
      )
      .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
      .where(eq(margonemAccountAccess.id, accessId))
      .limit(1);
    const rows = yield* persistenceQuery(operation, select);

    const [row] = rows;

    if (row === undefined) {
      return yield* new AccountAccessInviteNotFound();
    }

    const status = yield* parseAccountAccessStatus(row.status).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const accountDisplayName = yield* parseAccountDisplayName(
      row.accountDisplayName
    ).pipe(Effect.catch((error) => failPersistence(operation, error)));

    const accountId = yield* parseMargonemAccountId(row.accountId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const profileId = yield* parseMargonemProfileId(row.profileId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const invitedUserId = yield* parsePersistedAppUserId(
      operation,
      row.invitedUserId
    );
    const ownerUserId = yield* parsePersistedAppUserId(operation, row.ownerId);

    return {
      accessId,
      accountDisplayName,
      accountId,
      createdAt: row.createdAt,
      generatedProfileUrl: toMargonemProfileUrl(profileId),
      invitedUserId,
      ownerUserId,
      ownerUserImage: row.ownerImage,
      ownerUserName: row.ownerName,
      status,
      updatedAt: row.updatedAt,
    };
  });
