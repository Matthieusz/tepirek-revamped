import { EffectDatabase } from "@tepirek-revamped/db/effect";
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountAccess,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemAccountRefetchPreview,
  margonemAccountRefetchPreviewCharacter,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  not,
  or,
  sql,
} from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  canTransitionAccountAccess,
  parseAccountAccessStatus,
} from "../account-access-status.js";
import type { AccountAccessStatus } from "../account-access-status.js";
import {
  accountDisplayNameToString,
  parseAccountDisplayName,
} from "../account-display-name.js";
import { EffectAccountImportStore } from "../account-import/effect-account-import-store.js";
import type { ApplyAccountRefetchOutput } from "../account-refetch/apply-account-refetch.js";
import { EffectAccountRefetchStore } from "../account-refetch/effect-account-refetch-store.js";
import { EffectAccountSharingStore } from "../account-sharing/effect-account-sharing-store.js";
import { appUserIdToString, parseAppUserId } from "../app-user-id.js";
import type { AppUserId } from "../app-user-id.js";
import { firecrawlYearMonthToString } from "../firecrawl-year-month.js";
import {
  margonemAccountAccessIdToNumber,
  parseMargonemAccountAccessId,
} from "../margonem-account-access-id.js";
import type { MargonemAccountAccessId } from "../margonem-account-access-id.js";
import {
  margonemAccountIdToNumber,
  parseMargonemAccountId,
} from "../margonem-account-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import {
  parseMargonemProfession,
  parseMargonemWorld,
} from "../margonem-character.js";
import {
  parseMargonemCharacterId,
  parseMargonemProfileId,
  parsePositiveLevel,
  characterIdToNumber,
  levelToNumber,
  profileIdToNumber,
} from "../margonem-profile-id.js";
import { toMargonemProfileUrl } from "../margonem-profile-url.js";
import { pendingImportIdToNumber } from "../pending-margonem-account-import-id.js";
import {
  parsePendingMargonemAccountRefetchId,
  pendingRefetchIdToNumber,
} from "../pending-margonem-account-refetch-id.js";
import { isError } from "../result.js";
import type {
  SquadGroupAccess,
  SquadGroupOwnerAccess,
} from "../squad-group-access.js";
import { parseSquadGroupId, squadGroupIdToNumber } from "../squad-group-id.js";
import type { SquadGroupId } from "../squad-group-id.js";
import {
  parseSquadGroupInvitationId,
  squadGroupInvitationIdToNumber,
} from "../squad-group-invitation-id.js";
import type { SquadGroupInvitationId } from "../squad-group-invitation-id.js";
import {
  canTransitionSquadGroupInvitation,
  parseSquadGroupInvitationStatus,
} from "../squad-group-invitation-status.js";
import type { SquadGroupInvitationStatus } from "../squad-group-invitation-status.js";
import {
  squadGroupLevelBoundToNumber,
  squadGroupNameQueryToString,
} from "../squad-group-list-filters.js";
import { parseSquadGroupVisibility } from "../squad-group-visibility.js";
import { parseSquadId } from "../squad-id.js";
import {
  parseSquadGroupName,
  squadGroupNameToString,
  squadNameToString,
} from "../squad-name.js";
import {
  AccountAccessInviteNotFound,
  AccountAccessTransitionNotAllowed,
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnMargonemAccount,
  ActorDoesNotOwnSquadGroup,
  ActorIsNotInviteRecipient,
  ActorIsNotSquadGroupInviteRecipient,
  EditorCannotChangeSquadStructure,
  EffectSquadBuilderPersistenceUnavailable,
  InviteTargetNotFound,
  InviteTargetNotVerified,
  MargonemAccountNotFound,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountRefetchNotFound,
  SquadCharacterNotAccessible,
  SquadEditorInviteTargetNotFound,
  SquadEditorInviteTargetNotVerified,
  SquadGroupInvitationNotFound,
  SquadGroupInvitationTransitionNotAllowed,
  SquadGroupNotFound,
  SquadNotInGroup,
} from "./squad-group-errors.js";
import type {
  AvailableSquadCharacter,
  ApplyRefetchedAccountInput,
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  CreatePendingMargonemAccountRefetchInput,
  CreateSquadGroupStoreInput,
  DuplicateMargonemAccountError,
  FindOwnedAccountForSharingInput,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  GlobalSquadGroupSummary,
  GetSquadGroupDetailInput,
  ListAvailableCharactersForOwnerInput,
  ListIncomingAccountInvitesInput,
  ListGlobalSquadGroupsInput,
  ListMySquadGroupsInput,
  ListOwnedMargonemAccountsInput,
  ListSharedAccountsInput,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  MarkPendingMargonemAccountRefetchAppliedInput,
  OwnedMargonemAccountSummary,
  OwnedAccountForSharing,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  ProfileAccessState,
  RefetchableMargonemAccount,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  SaveSharedSquadGroupCharactersStoreInput,
  SaveSquadGroupSnapshotStoreInput,
  SearchInviteTargetsStoreInput,
  RespondToSquadGroupInviteStoreInput,
  RespondToAccountAccessInviteStoreInput,
  RevokeAccountAccessResult,
  RevokeAccountAccessStoreInput,
  RevokeSquadGroupEditorStoreInput,
  SetSquadGroupVisibilityStoreInput,
  SharedMargonemAccountSummary,
  SharedSquadGroupSummary,
  SearchSquadEditorInviteTargetsStoreInput,
  SquadEditorInviteTarget,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SquadGroupVisibilityChange,
  AccountInviteTarget,
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  UpsertSquadGroupEditorInviteInput,
  SquadGroupCharacter,
  SquadGroupDetail,
  SquadGroupSummary,
} from "./squad-group-store.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

type EffectSquadGroupPersistenceOperation =
  | "applyRefetchedAccount"
  | "authorizeSquadGroupOwner"
  | "createPendingImport"
  | "createOwnedAccountFromPendingImport"
  | "createPendingRefetch"
  | "createSquadGroup"
  | "findOwnedAccountForSharing"
  | "findVerifiedInviteTarget"
  | "findVerifiedSquadEditorInviteTarget"
  | "findPendingImportForConfirmation"
  | "findPendingRefetchForApply"
  | "findProfileAccessState"
  | "getAccountForRefetch"
  | "getSquadGroupDetail"
  | "listAvailableCharactersForOwner"
  | "listAccountAccessGrants"
  | "listIncomingSquadGroupInvites"
  | "listGlobalSquadGroups"
  | "getPendingSquadGroupInviteCount"
  | "listIncomingAccountInvites"
  | "listSharedAccounts"
  | "listSharedSquadGroups"
  | "listSquadGroupEditorGrants"
  | "listOwnedAccounts"
  | "listMySquadGroups"
  | "markRequestFailed"
  | "markRequestSucceeded"
  | "markPendingRefetchApplied"
  | "reserveRequest"
  | "respondToAccountAccessInvite"
  | "respondToSquadGroupInvite"
  | "revokeAccountAccess"
  | "revokeSquadGroupEditor"
  | "saveSharedSquadGroupCharacters"
  | "saveSquadGroupSnapshot"
  | "searchSquadEditorInviteTargets"
  | "searchInviteTargets"
  | "upsertAccountAccessInvite"
  | "upsertSquadGroupEditorInvite"
  | "setSquadGroupVisibility";

const usedFirecrawlRequestStatuses = [
  "reserved",
  "succeeded",
  "failed",
] as const;

const escapeLikePattern = (value: string): string =>
  value.replaceAll(/[\\%_]/gu, "\\$&");

const failPersistence = (
  operation: EffectSquadGroupPersistenceOperation,
  cause: unknown
) =>
  Effect.fail(
    new EffectSquadBuilderPersistenceUnavailable({
      cause,
      operation,
      provider: "postgres",
    })
  );

// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params
const persistenceQuery = <A>(
  operation: EffectSquadGroupPersistenceOperation,
  self: Effect.Effect<A, unknown, unknown>
): Effect.Effect<A, EffectSquadBuilderPersistenceUnavailable, never> =>
  // SAFETY: The second type parameter of the incoming Effect is widened to
  // `unknown` by Drizzle's query builder but the actual runtime error type is
  // always `never` (Drizzle throws, not returns typed errors). The cast
  // narrows it so `Effect.catch` can catch any thrown error and rewrap it as
  // `EffectSquadBuilderPersistenceUnavailable`.
  Effect.catch(self as Effect.Effect<A, unknown, never>, (error) =>
    failPersistence(operation, error)
  );
// oxlint-enable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params

// SAFETY: Same rationale as persistenceQuery — Drizzle query effects carry
// `unknown` error type but never produce typed failures at runtime. The cast
// erases the error parameter so callers can self-assemble their error type in
// the gen block without false positive type mismatches.
const persistenceQueryUnsafe = <A>(
  self: Effect.Effect<A, unknown, unknown>
): Effect.Effect<A, unknown, never> => self as Effect.Effect<A, unknown, never>;

const parsePersistedAppUserId = (
  operation: EffectSquadGroupPersistenceOperation,
  value: string
): Effect.Effect<
  AppUserId,
  EffectSquadBuilderPersistenceUnavailable,
  never
> => {
  const userId = parseAppUserId(value);

  if (isError(userId)) {
    return failPersistence(operation, userId.error);
  }

  return Effect.succeed(userId.value);
};

const parsePersistedSquadGroupName = (
  operation: EffectSquadGroupPersistenceOperation,
  value: string
) => {
  const name = parseSquadGroupName(value);

  if (isError(name)) {
    return failPersistence(operation, name.error);
  }

  return Effect.succeed(name.value);
};

const findProfileAccessStateWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    profileId,
  }: FindProfileAccessStateInput): Effect.Effect<
    ProfileAccessState,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* findProfileAccessStateEffect() {
      const operation = "findProfileAccessState" as const;
      const accountSelect = database
        .select({
          id: margonemAccount.id,
          ownerUserId: margonemAccount.ownerUserId,
        })
        .from(margonemAccount)
        .where(eq(margonemAccount.profileId, profileIdToNumber(profileId)))
        .limit(1);
      const accountRows = yield* persistenceQuery(operation, accountSelect);

      const [account] = accountRows;

      if (account === undefined) {
        return { _tag: "Available" as const };
      }

      if (account.ownerUserId === appUserIdToString(actorUserId)) {
        return { _tag: "OwnedByActor" as const };
      }

      const accessSelect = database
        .select({ id: margonemAccountAccess.id })
        .from(margonemAccountAccess)
        .where(
          and(
            eq(margonemAccountAccess.accountId, account.id),
            eq(margonemAccountAccess.userId, appUserIdToString(actorUserId)),
            eq(margonemAccountAccess.status, "accepted")
          )
        )
        .limit(1);
      const accessRows = yield* persistenceQuery(operation, accessSelect);

      if (accessRows[0] !== undefined) {
        return { _tag: "SharedWithActor" as const };
      }

      return { _tag: "OwnedByAnotherUser" as const };
    });

const reserveRequestWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    monthlyRequestBudget,
    profileId,
    requestedByUserId,
    yearMonth,
  }: ReserveFirecrawlRequestInput): Effect.Effect<
    ReservedFirecrawlRequest,
    | {
        readonly _tag: "FirecrawlMonthlyBudgetExhausted";
        readonly yearMonth: typeof yearMonth;
        readonly monthlyRequestBudget: number;
        readonly usedRequests: number;
      }
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* reserveRequestEffect() {
      const operation = "reserveRequest" as const;
      const yearMonthText = firecrawlYearMonthToString(yearMonth);
      const transaction = database.transaction((tx) => {
        const transactionEffect = Effect.gen(function* reserveInTransaction() {
          yield* persistenceQueryUnsafe(
            tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${`firecrawl:${yearMonthText}`}))`
            )
          );
          const usageSelect = tx
            .select({ usedRequests: count() })
            .from(firecrawlProfileScrapeRequest)
            .where(
              and(
                eq(firecrawlProfileScrapeRequest.yearMonth, yearMonthText),
                inArray(
                  firecrawlProfileScrapeRequest.status,
                  usedFirecrawlRequestStatuses
                )
              )
            );
          const usageRows = yield* persistenceQueryUnsafe(usageSelect);

          const usedRequests = usageRows[0]?.usedRequests ?? 0;

          if (usedRequests >= monthlyRequestBudget) {
            return yield* Effect.fail({
              _tag: "FirecrawlMonthlyBudgetExhausted" as const,
              monthlyRequestBudget,
              usedRequests,
              yearMonth,
            });
          }

          const insert = tx
            .insert(firecrawlProfileScrapeRequest)
            .values({
              profileId: profileIdToNumber(profileId),
              requestedByUserId: appUserIdToString(requestedByUserId),
              status: "reserved",
              yearMonth: yearMonthText,
            })
            .returning({ id: firecrawlProfileScrapeRequest.id });
          const insertedRows = yield* persistenceQueryUnsafe(insert);

          const [reserved] = insertedRows;

          if (reserved === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to reserve Firecrawl request")
            );
          }

          const nextUsedRequests = usedRequests + 1;

          return {
            budgetState: {
              monthlyRequestBudget,
              remainingRequests: monthlyRequestBudget - nextUsedRequests,
              usedRequests: nextUsedRequests,
              yearMonth,
            },
            requestId: reserved.id,
          };
        });

        return transactionEffect;
      });

      return yield* persistenceQuery(operation, transaction);
    });

const markRequestSucceededWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    cacheState,
    creditsUsed,
    firecrawlStatusCode,
    requestId,
  }: MarkFirecrawlRequestSucceededInput): Effect.Effect<
    void,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > => {
    const operation = "markRequestSucceeded" as const;
    const update = database
      .update(firecrawlProfileScrapeRequest)
      .set({
        cacheState,
        completedAt: new Date(),
        creditsUsed,
        firecrawlStatusCode,
        status: "succeeded",
      })
      .where(eq(firecrawlProfileScrapeRequest.id, requestId));

    return persistenceQuery(operation, update).pipe(Effect.asVoid);
  };

const markRequestFailedWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    errorTag,
    requestId,
  }: MarkFirecrawlRequestFailedInput): Effect.Effect<
    void,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > => {
    const operation = "markRequestFailed" as const;
    const update = database
      .update(firecrawlProfileScrapeRequest)
      .set({ completedAt: new Date(), errorTag, status: "failed" })
      .where(eq(firecrawlProfileScrapeRequest.id, requestId));

    return persistenceQuery(operation, update).pipe(Effect.asVoid);
  };

const createPendingImportWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    defaultDisplayName,
    expiresAt,
    fetchedAt,
    firecrawlCreditsUsed,
    jarunaCharacters,
    profileId,
    suggestedAccountName,
  }: CreatePendingMargonemAccountImportInput): Effect.Effect<
    PendingMargonemAccountImport,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* createPendingImportEffect() {
      const operation = "createPendingImport" as const;
      const transaction = database.transaction((tx) =>
        Effect.gen(function* createPendingImportTransaction() {
          const insert = tx
            .insert(margonemAccountImportPreview)
            .values({
              actorUserId: appUserIdToString(actorUserId),
              defaultDisplayName:
                accountDisplayNameToString(defaultDisplayName),
              expiresAt,
              fetchedAt,
              firecrawlCreditsUsed,
              profileId: profileIdToNumber(profileId),
              suggestedAccountName,
            })
            .returning({ id: margonemAccountImportPreview.id });
          const insertedRows = yield* persistenceQueryUnsafe(insert);

          const [preview] = insertedRows;

          if (preview === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to create pending import preview")
            );
          }

          if (jarunaCharacters.length > 0) {
            const characterInsert = tx
              .insert(margonemAccountImportPreviewCharacter)
              .values(
                jarunaCharacters.map((character) => ({
                  avatarUrl: character.avatarUrl,
                  characterId: characterIdToNumber(character.characterId),
                  importPreviewId: preview.id,
                  level: levelToNumber(character.level),
                  name: character.name,
                  profession: character.profession,
                  world: character.world,
                }))
              );
            yield* persistenceQueryUnsafe(characterInsert);
          }

          return {
            id: preview.id as PendingMargonemAccountImport["id"],
            profileId,
          };
        })
      );

      return yield* persistenceQuery(operation, transaction);
    });

const findPendingImportForConfirmationWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    now,
    pendingImportId,
  }: FindPendingMargonemAccountImportInput): Effect.Effect<
    PendingMargonemAccountImportForConfirmation,
    | PendingMargonemAccountImportNotFound
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* findPendingImportForConfirmationEffect() {
      const operation = "findPendingImportForConfirmation" as const;
      const previewSelect = database
        .select({
          fetchedAt: margonemAccountImportPreview.fetchedAt,
          id: margonemAccountImportPreview.id,
          profileId: margonemAccountImportPreview.profileId,
        })
        .from(margonemAccountImportPreview)
        .where(
          and(
            eq(
              margonemAccountImportPreview.id,
              pendingImportIdToNumber(pendingImportId)
            ),
            eq(
              margonemAccountImportPreview.actorUserId,
              appUserIdToString(actorUserId)
            ),
            isNull(margonemAccountImportPreview.confirmedAt),
            gt(margonemAccountImportPreview.expiresAt, now)
          )
        )
        .limit(1);
      const previewRows = yield* persistenceQuery(operation, previewSelect);

      const [preview] = previewRows;

      if (preview === undefined) {
        return yield* new PendingMargonemAccountImportNotFound();
      }

      const characterSelect = database
        .select({
          avatarUrl: margonemAccountImportPreviewCharacter.avatarUrl,
          characterId: margonemAccountImportPreviewCharacter.characterId,
          level: margonemAccountImportPreviewCharacter.level,
          name: margonemAccountImportPreviewCharacter.name,
          profession: margonemAccountImportPreviewCharacter.profession,
          world: margonemAccountImportPreviewCharacter.world,
        })
        .from(margonemAccountImportPreviewCharacter)
        .where(
          eq(margonemAccountImportPreviewCharacter.importPreviewId, preview.id)
        );
      const characterRows = yield* persistenceQuery(operation, characterSelect);

      const jarunaCharacters = [];

      for (const row of characterRows) {
        const characterId = parseMargonemCharacterId(row.characterId);

        if (isError(characterId)) {
          return yield* failPersistence(operation, characterId.error);
        }

        const level = parsePositiveLevel(row.level);

        if (isError(level)) {
          return yield* failPersistence(operation, level.error);
        }

        const profession = parseMargonemProfession(row.profession);

        if (isError(profession)) {
          return yield* failPersistence(operation, profession.error);
        }

        const world = parseMargonemWorld(row.world);

        if (isError(world)) {
          return yield* failPersistence(operation, world.error);
        }

        jarunaCharacters.push({
          avatarUrl: row.avatarUrl,
          characterId: characterId.value,
          level: level.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        });
      }

      const profileId = parseMargonemProfileId(preview.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      return {
        actorUserId,
        fetchedAt: preview.fetchedAt,
        id: pendingImportId,
        jarunaCharacters,
        profileId: profileId.value,
      };
    });

const createOwnedAccountFromPendingImportWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    displayName,
    pending,
  }: CreateOwnedAccountFromPendingImportInput): Effect.Effect<
    OwnedMargonemAccountSummary,
    DuplicateMargonemAccountError | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* createOwnedAccountFromPendingImportEffect() {
      const operation = "createOwnedAccountFromPendingImport" as const;
      const transaction = database.transaction((tx) =>
        Effect.gen(function* createOwnedAccountFromPendingImportTransaction() {
          const existingSelect = tx
            .select({ ownerUserId: margonemAccount.ownerUserId })
            .from(margonemAccount)
            .where(
              eq(
                margonemAccount.profileId,
                profileIdToNumber(pending.profileId)
              )
            )
            .limit(1);
          const existingRows = yield* persistenceQueryUnsafe(existingSelect);

          const [existing] = existingRows;

          if (existing !== undefined) {
            return existing.ownerUserId === appUserIdToString(actorUserId)
              ? ({ _tag: "MargonemAccountAlreadyOwnedByActor" } as const)
              : ({ _tag: "MargonemAccountOwnedByAnotherUser" } as const);
          }

          const insert = tx
            .insert(margonemAccount)
            .values({
              displayName: accountDisplayNameToString(displayName),
              lastFetchedAt: pending.fetchedAt,
              ownerUserId: appUserIdToString(actorUserId),
              profileId: profileIdToNumber(pending.profileId),
            })
            .returning({
              createdAt: margonemAccount.createdAt,
              id: margonemAccount.id,
            });
          const accountRows = yield* persistenceQueryUnsafe(insert);

          const [account] = accountRows;

          if (account === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to insert owned account")
            );
          }

          if (pending.jarunaCharacters.length > 0) {
            const characterInsert = tx.insert(margonemCharacter).values(
              pending.jarunaCharacters.map((character) => ({
                accountId: account.id,
                avatarUrl: character.avatarUrl,
                characterId: characterIdToNumber(character.characterId),
                level: levelToNumber(character.level),
                name: character.name,
                profession: character.profession,
                world: character.world,
              }))
            );
            yield* persistenceQueryUnsafe(characterInsert);
          }

          const update = tx
            .update(margonemAccountImportPreview)
            .set({ confirmedAt: new Date() })
            .where(
              eq(
                margonemAccountImportPreview.id,
                pendingImportIdToNumber(pending.id)
              )
            );
          yield* persistenceQueryUnsafe(update);

          return {
            accountId: account.id,
            characterCount: pending.jarunaCharacters.length,
            displayName,
            generatedProfileUrl: toMargonemProfileUrl(pending.profileId),
            lastFetchedAt: pending.fetchedAt,
            profileId: pending.profileId,
          };
        })
      );

      const result = yield* persistenceQuery(operation, transaction);

      if (
        "_tag" in result &&
        (result._tag === "MargonemAccountAlreadyOwnedByActor" ||
          result._tag === "MargonemAccountOwnedByAnotherUser" ||
          result._tag === "MargonemAccountAlreadySharedWithActor")
      ) {
        return yield* Effect.fail(result);
      }

      return result;
    });

const createSquadGroupWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    name,
  }: CreateSquadGroupStoreInput): Effect.Effect<
    SquadGroupSummary,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* createSquadGroupEffect() {
      const insert = database
        .insert(squadGroup)
        .values({
          name: squadGroupNameToString(name),
          ownerUserId: appUserIdToString(actorUserId),
          visibility: "private",
        })
        .returning({
          id: squadGroup.id,
          updatedAt: squadGroup.updatedAt,
        });

      const createdRows = yield* persistenceQuery("createSquadGroup", insert);

      const [created] = createdRows;

      if (created === undefined) {
        return yield* failPersistence(
          "createSquadGroup",
          new Error("Failed to insert squad group")
        );
      }

      const groupId = parseSquadGroupId(created.id);

      if (isError(groupId)) {
        return yield* failPersistence("createSquadGroup", groupId.error);
      }

      return {
        characterCount: 0,
        groupId: groupId.value,
        name,
        squadCount: 0,
        updatedAt: created.updatedAt,
      };
    });

const listMySquadGroupsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListMySquadGroupsInput): Effect.Effect<
    readonly SquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listMySquadGroupsEffect() {
      const select = database
        .select({
          characterCount: sql<number>`count(distinct ${squadCharacter.id})::int`,
          groupId: squadGroup.id,
          name: squadGroup.name,
          squadCount: sql<number>`count(distinct ${squad.id})::int`,
          updatedAt: squadGroup.updatedAt,
        })
        .from(squadGroup)
        .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
        .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
        .where(eq(squadGroup.ownerUserId, appUserIdToString(actorUserId)))
        .groupBy(squadGroup.id)
        .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id));

      const rows = yield* persistenceQuery("listMySquadGroups", select);

      const groups: SquadGroupSummary[] = [];

      for (const row of rows) {
        const groupId = parseSquadGroupId(row.groupId);

        if (isError(groupId)) {
          return yield* failPersistence("listMySquadGroups", groupId.error);
        }

        const name = parseSquadGroupName(row.name);

        if (isError(name)) {
          return yield* failPersistence("listMySquadGroups", name.error);
        }

        groups.push({
          characterCount: row.characterCount ?? 0,
          groupId: groupId.value,
          name: name.value,
          squadCount: row.squadCount ?? 0,
          updatedAt: row.updatedAt,
        });
      }

      return groups;
    });

const listOwnedAccountsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListOwnedMargonemAccountsInput): Effect.Effect<
    readonly OwnedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listOwnedAccountsEffect() {
      const operation = "listOwnedAccounts" as const;
      const select = database
        .select({
          accountId: margonemAccount.id,
          characterCount: sql<number>`count(${margonemCharacter.id})::int`.as(
            "character_count"
          ),
          createdAt: margonemAccount.createdAt,
          displayName: margonemAccount.displayName,
          lastFetchedAt: margonemAccount.lastFetchedAt,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccount)
        .leftJoin(
          margonemCharacter,
          eq(margonemCharacter.accountId, margonemAccount.id)
        )
        .where(eq(margonemAccount.ownerUserId, appUserIdToString(actorUserId)))
        .groupBy(margonemAccount.id)
        .orderBy(desc(margonemAccount.createdAt), desc(margonemAccount.id));
      const rows = yield* persistenceQuery(operation, select);

      const accounts: OwnedMargonemAccountSummary[] = [];

      for (const row of rows) {
        const displayName = parseAccountDisplayName(row.displayName);

        if (isError(displayName)) {
          return yield* failPersistence(operation, displayName.error);
        }

        const profileId = parseMargonemProfileId(row.profileId);

        if (isError(profileId)) {
          return yield* failPersistence(operation, profileId.error);
        }

        accounts.push({
          accountId: row.accountId,
          characterCount: row.characterCount ?? 0,
          displayName: displayName.value,
          generatedProfileUrl: toMargonemProfileUrl(profileId.value),
          lastFetchedAt: row.lastFetchedAt ?? row.createdAt,
          profileId: profileId.value,
        });
      }

      return accounts;
    });

const getAccountForRefetchWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }): Effect.Effect<
    RefetchableMargonemAccount,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* getAccountForRefetchEffect() {
      const operation = "getAccountForRefetch" as const;
      const accountIdNumber = margonemAccountIdToNumber(accountId);
      const accountSelect = database
        .select({
          displayName: margonemAccount.displayName,
          ownerUserId: margonemAccount.ownerUserId,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccount)
        .where(eq(margonemAccount.id, accountIdNumber))
        .limit(1);
      const accountRows = yield* persistenceQuery(operation, accountSelect);

      const [account] = accountRows;

      if (account === undefined) {
        return yield* new MargonemAccountNotFound();
      }

      if (account.ownerUserId !== appUserIdToString(actorUserId)) {
        return yield* new ActorDoesNotOwnMargonemAccount();
      }

      const characterSelect = database
        .select({
          affectedSquadCount: sql<number>`count(${squadCharacter.id})::int`,
          avatarUrl: margonemCharacter.avatarUrl,
          characterId: margonemCharacter.characterId,
          id: margonemCharacter.id,
          level: margonemCharacter.level,
          name: margonemCharacter.name,
          profession: margonemCharacter.profession,
          world: margonemCharacter.world,
        })
        .from(margonemCharacter)
        .leftJoin(
          squadCharacter,
          eq(squadCharacter.characterId, margonemCharacter.id)
        )
        .where(eq(margonemCharacter.accountId, accountIdNumber))
        .groupBy(margonemCharacter.id);
      const characterRows = yield* persistenceQuery(operation, characterSelect);

      const displayName = parseAccountDisplayName(account.displayName);

      if (isError(displayName)) {
        return yield* failPersistence(operation, displayName.error);
      }

      const profileId = parseMargonemProfileId(account.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      const currentCharacters: RefetchableMargonemAccount["currentCharacters"][number][] =
        [];

      for (const row of characterRows) {
        const margonemCharacterId = parseMargonemCharacterId(row.characterId);

        if (isError(margonemCharacterId)) {
          return yield* failPersistence(operation, margonemCharacterId.error);
        }

        const level = parsePositiveLevel(row.level);

        if (isError(level)) {
          return yield* failPersistence(operation, level.error);
        }

        const profession = parseMargonemProfession(row.profession);

        if (isError(profession)) {
          return yield* failPersistence(operation, profession.error);
        }

        const world = parseMargonemWorld(row.world);

        if (isError(world)) {
          return yield* failPersistence(operation, world.error);
        }

        currentCharacters.push({
          affectedSquadCount: row.affectedSquadCount ?? 0,
          avatarUrl: row.avatarUrl,
          databaseCharacterId: row.id,
          level: level.value,
          margonemCharacterId: margonemCharacterId.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        });
      }

      return {
        accountId,
        currentCharacters,
        displayName: displayName.value,
        profileId: profileId.value,
      };
    });

const createPendingRefetchWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
    actorUserId,
    diff,
    expiresAt,
    fetchedAt,
    firecrawlCreditsUsed,
    latestCharacters,
    profileId,
  }: CreatePendingMargonemAccountRefetchInput): Effect.Effect<
    PendingMargonemAccountRefetch,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* createPendingRefetchEffect() {
      const operation = "createPendingRefetch" as const;
      const transaction = database.transaction((tx) =>
        Effect.gen(function* createPendingRefetchTransaction() {
          const insert = tx
            .insert(margonemAccountRefetchPreview)
            .values({
              accountId: margonemAccountIdToNumber(accountId),
              actorUserId: appUserIdToString(actorUserId),
              diffJson: JSON.stringify(diff),
              expiresAt,
              fetchedAt,
              firecrawlCreditsUsed,
              profileId: profileIdToNumber(profileId),
            })
            .returning({ id: margonemAccountRefetchPreview.id });
          const insertedRows = yield* persistenceQueryUnsafe(insert);

          const [preview] = insertedRows;

          if (preview === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to create pending refetch preview")
            );
          }

          if (latestCharacters.length > 0) {
            const characterInsert = tx
              .insert(margonemAccountRefetchPreviewCharacter)
              .values(
                latestCharacters.map((character) => ({
                  avatarUrl: character.avatarUrl,
                  characterId: characterIdToNumber(character.characterId),
                  level: levelToNumber(character.level),
                  name: character.name,
                  profession: character.profession,
                  refetchPreviewId: preview.id,
                  world: character.world,
                }))
              );
            yield* persistenceQueryUnsafe(characterInsert);
          }

          const pendingRefetchId = parsePendingMargonemAccountRefetchId(
            preview.id
          );

          if (isError(pendingRefetchId)) {
            return yield* failPersistence(operation, pendingRefetchId.error);
          }

          return { id: pendingRefetchId.value };
        })
      );

      return yield* persistenceQuery(operation, transaction);
    });

const findPendingRefetchForApplyWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    now,
    refetchPreviewId,
  }: {
    readonly actorUserId: AppUserId;
    readonly refetchPreviewId: PendingMargonemAccountRefetch["id"];
    readonly now: Date;
  }): Effect.Effect<
    PendingMargonemAccountRefetchForApply,
    | PendingMargonemAccountRefetchNotFound
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* findPendingRefetchForApplyEffect() {
      const operation = "findPendingRefetchForApply" as const;
      const previewSelect = database
        .select({
          accountId: margonemAccountRefetchPreview.accountId,
          actorUserId: margonemAccountRefetchPreview.actorUserId,
          fetchedAt: margonemAccountRefetchPreview.fetchedAt,
          id: margonemAccountRefetchPreview.id,
          profileId: margonemAccountRefetchPreview.profileId,
        })
        .from(margonemAccountRefetchPreview)
        .where(
          and(
            eq(
              margonemAccountRefetchPreview.id,
              pendingRefetchIdToNumber(refetchPreviewId)
            ),
            eq(
              margonemAccountRefetchPreview.actorUserId,
              appUserIdToString(actorUserId)
            ),
            isNull(margonemAccountRefetchPreview.appliedAt),
            gt(margonemAccountRefetchPreview.expiresAt, now)
          )
        )
        .limit(1);
      const previewRows = yield* persistenceQuery(operation, previewSelect);

      const [preview] = previewRows;

      if (preview === undefined) {
        return yield* new PendingMargonemAccountRefetchNotFound();
      }

      const characterSelect = database
        .select({
          avatarUrl: margonemAccountRefetchPreviewCharacter.avatarUrl,
          characterId: margonemAccountRefetchPreviewCharacter.characterId,
          level: margonemAccountRefetchPreviewCharacter.level,
          name: margonemAccountRefetchPreviewCharacter.name,
          profession: margonemAccountRefetchPreviewCharacter.profession,
          world: margonemAccountRefetchPreviewCharacter.world,
        })
        .from(margonemAccountRefetchPreviewCharacter)
        .where(
          eq(
            margonemAccountRefetchPreviewCharacter.refetchPreviewId,
            preview.id
          )
        );
      const characterRows = yield* persistenceQuery(operation, characterSelect);

      const latestCharacters = [];

      for (const row of characterRows) {
        const characterId = parseMargonemCharacterId(row.characterId);

        if (isError(characterId)) {
          return yield* failPersistence(operation, characterId.error);
        }

        const level = parsePositiveLevel(row.level);

        if (isError(level)) {
          return yield* failPersistence(operation, level.error);
        }

        const profession = parseMargonemProfession(row.profession);

        if (isError(profession)) {
          return yield* failPersistence(operation, profession.error);
        }

        const world = parseMargonemWorld(row.world);

        if (isError(world)) {
          return yield* failPersistence(operation, world.error);
        }

        latestCharacters.push({
          avatarUrl: row.avatarUrl,
          characterId: characterId.value,
          level: level.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        });
      }

      const accountId = parseMargonemAccountId(preview.accountId);

      if (isError(accountId)) {
        return yield* failPersistence(operation, accountId.error);
      }

      const persistedActorUserId = yield* parsePersistedAppUserId(
        operation,
        preview.actorUserId
      );
      const profileId = parseMargonemProfileId(preview.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      return {
        accountId: accountId.value,
        actorUserId: persistedActorUserId,
        fetchedAt: preview.fetchedAt,
        id: refetchPreviewId,
        latestCharacters,
        profileId: profileId.value,
      };
    });

const markPendingRefetchAppliedWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    appliedAt,
    refetchPreviewId,
  }: MarkPendingMargonemAccountRefetchAppliedInput): Effect.Effect<
    void,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > => {
    const operation = "markPendingRefetchApplied" as const;
    const update = database
      .update(margonemAccountRefetchPreview)
      .set({ appliedAt })
      .where(
        eq(
          margonemAccountRefetchPreview.id,
          pendingRefetchIdToNumber(refetchPreviewId)
        )
      );
    return persistenceQuery(operation, update).pipe(Effect.asVoid);
  };

const applyRefetchedAccountWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    now,
    pendingRefetch,
  }: ApplyRefetchedAccountInput): Effect.Effect<
    ApplyAccountRefetchOutput,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* applyRefetchedAccountEffect() {
      const operation = "applyRefetchedAccount" as const;
      const transaction = database.transaction((tx) =>
        Effect.gen(function* applyRefetchedAccountTransaction() {
          const accountIdNumber = margonemAccountIdToNumber(
            pendingRefetch.accountId
          );

          yield* persistenceQueryUnsafe(
            tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${`margonem-refetch:${accountIdNumber}`}))`
            )
          );

          const accountSelect = tx
            .select({ id: margonemAccount.id })
            .from(margonemAccount)
            .where(
              and(
                eq(margonemAccount.id, accountIdNumber),
                eq(margonemAccount.ownerUserId, appUserIdToString(actorUserId))
              )
            )
            .limit(1);
          const accountRows = yield* persistenceQueryUnsafe(accountSelect);

          if (accountRows[0] === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Account not found while applying refetch")
            );
          }

          const currentSelect = tx
            .select({
              avatarUrl: margonemCharacter.avatarUrl,
              characterId: margonemCharacter.characterId,
              id: margonemCharacter.id,
              level: margonemCharacter.level,
              name: margonemCharacter.name,
              profession: margonemCharacter.profession,
            })
            .from(margonemCharacter)
            .where(eq(margonemCharacter.accountId, accountIdNumber));
          const currentRows = yield* persistenceQueryUnsafe(currentSelect);

          const currentByCharacterId = new Map<
            number,
            (typeof currentRows)[number]
          >();

          for (const current of currentRows) {
            currentByCharacterId.set(current.characterId, current);
          }

          const latestByCharacterId = new Map<number, true>();
          const charactersToInsert = [];
          const charactersToUpdate = [];
          const removedDatabaseCharacterIds = [];

          for (const latest of pendingRefetch.latestCharacters) {
            const latestCharacterId = characterIdToNumber(latest.characterId);
            const latestLevel = levelToNumber(latest.level);
            const current = currentByCharacterId.get(latestCharacterId);
            latestByCharacterId.set(latestCharacterId, true);

            if (current === undefined) {
              charactersToInsert.push({
                accountId: accountIdNumber,
                avatarUrl: latest.avatarUrl,
                characterId: latestCharacterId,
                level: latestLevel,
                name: latest.name,
                profession: latest.profession,
                updatedAt: now,
                world: latest.world,
              });
              continue;
            }

            const changed =
              current.avatarUrl !== latest.avatarUrl ||
              current.level !== latestLevel ||
              current.name !== latest.name ||
              current.profession !== latest.profession;

            if (changed) {
              charactersToUpdate.push({
                avatarUrl: latest.avatarUrl,
                databaseCharacterId: current.id,
                level: latestLevel,
                name: latest.name,
                profession: latest.profession,
                world: latest.world,
              });
            }
          }

          if (charactersToInsert.length > 0) {
            yield* persistenceQueryUnsafe(
              tx.insert(margonemCharacter).values(charactersToInsert)
            );
          }

          for (const character of charactersToUpdate) {
            yield* persistenceQueryUnsafe(
              tx
                .update(margonemCharacter)
                .set({
                  avatarUrl: character.avatarUrl,
                  level: character.level,
                  name: character.name,
                  profession: character.profession,
                  updatedAt: now,
                  world: character.world,
                })
                .where(eq(margonemCharacter.id, character.databaseCharacterId))
            );
          }

          for (const current of currentRows) {
            if (!latestByCharacterId.has(current.characterId)) {
              removedDatabaseCharacterIds.push(current.id);
            }
          }

          let removedSquadCharacterCount = 0;

          if (removedDatabaseCharacterIds.length > 0) {
            const affectedGroupSelect = tx
              .select({ groupId: squadCharacter.squadGroupId })
              .from(squadCharacter)
              .where(
                inArray(squadCharacter.characterId, removedDatabaseCharacterIds)
              );
            const affectedGroups =
              yield* persistenceQueryUnsafe(affectedGroupSelect);

            const affectedGroupIds = [
              ...new Set(affectedGroups.map((group) => group.groupId)),
            ];
            const removedPlacementsDelete = tx
              .delete(squadCharacter)
              .where(
                inArray(squadCharacter.characterId, removedDatabaseCharacterIds)
              )
              .returning({ id: squadCharacter.id });
            const removedPlacements = yield* persistenceQueryUnsafe(
              removedPlacementsDelete
            );

            removedSquadCharacterCount = removedPlacements.length;

            if (affectedGroupIds.length > 0) {
              yield* persistenceQueryUnsafe(
                tx
                  .update(squadGroup)
                  .set({ updatedAt: now })
                  .where(inArray(squadGroup.id, affectedGroupIds))
              );
            }

            yield* persistenceQueryUnsafe(
              tx
                .delete(margonemCharacter)
                .where(
                  inArray(margonemCharacter.id, removedDatabaseCharacterIds)
                )
            );
          }

          yield* persistenceQueryUnsafe(
            tx
              .update(margonemAccount)
              .set({ lastFetchedAt: pendingRefetch.fetchedAt, updatedAt: now })
              .where(eq(margonemAccount.id, accountIdNumber))
          );

          return {
            accountId: pendingRefetch.accountId,
            addedCharacterCount: charactersToInsert.length,
            lastFetchedAt: pendingRefetch.fetchedAt,
            profileId: pendingRefetch.profileId,
            removedCharacterCount: removedDatabaseCharacterIds.length,
            removedSquadCharacterCount,
            updatedCharacterCount: charactersToUpdate.length,
          };
        })
      );

      return yield* persistenceQuery(operation, transaction);
    });

const searchInviteTargetsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
    actorUserId,
    query,
  }: SearchInviteTargetsStoreInput): Effect.Effect<
    readonly AccountInviteTarget[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* searchInviteTargetsEffect() {
      const operation = "searchInviteTargets" as const;
      const accountIdNumber = margonemAccountIdToNumber(accountId);
      const actor = appUserIdToString(actorUserId);
      const select = database
        .select({
          image: user.image,
          name: user.name,
          userId: user.id,
        })
        .from(user)
        .where(
          and(
            eq(user.verified, true),
            ne(user.id, actor),
            ilike(user.name, `%${query}%`),
            not(
              sql`${user.id} in (
                select ${margonemAccountAccess.userId}
                from ${margonemAccountAccess}
                where ${margonemAccountAccess.accountId} = ${accountIdNumber}
                  and ${margonemAccountAccess.status} in ('pending', 'accepted')
              )`
            )
          )
        )
        .orderBy(user.name)
        .limit(10);
      const rows = yield* persistenceQuery(operation, select);

      const targets: AccountInviteTarget[] = [];

      for (const row of rows) {
        const userId = parseAppUserId(row.userId);

        if (isError(userId)) {
          return yield* failPersistence(operation, userId.error);
        }

        targets.push({
          image: row.image,
          name: row.name,
          userId: userId.value,
        });
      }

      return targets;
    });

const authorizeSquadGroupOwnerWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    groupId,
  }: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Effect.Effect<
    SquadGroupOwnerAccess,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* authorizeSquadGroupOwnerEffect() {
      const operation = "authorizeSquadGroupOwner" as const;
      const select = database
        .select({ ownerUserId: squadGroup.ownerUserId })
        .from(squadGroup)
        .where(eq(squadGroup.id, squadGroupIdToNumber(groupId)))
        .limit(1);
      const rows = yield* persistenceQuery(operation, select);

      const [group] = rows;

      if (group === undefined) {
        return yield* new SquadGroupNotFound();
      }

      if (group.ownerUserId !== appUserIdToString(actorUserId)) {
        return yield* new ActorDoesNotOwnSquadGroup();
      }

      return {
        _tag: "SquadGroupOwnerAccess" as const,
        groupId,
        ownerUserId: actorUserId,
        role: "owner" as const,
      };
    });

const searchSquadEditorInviteTargetsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    groupId,
    maxResults,
    ownerUserId,
    query,
  }: SearchSquadEditorInviteTargetsStoreInput): Effect.Effect<
    readonly SquadEditorInviteTarget[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* searchSquadEditorInviteTargetsEffect() {
      const operation = "searchSquadEditorInviteTargets" as const;
      const groupIdNumber = squadGroupIdToNumber(groupId);
      const owner = appUserIdToString(ownerUserId);
      const select = database
        .select({ image: user.image, name: user.name, userId: user.id })
        .from(user)
        .where(
          and(
            eq(user.verified, true),
            ne(user.id, owner),
            ilike(user.name, `%${query}%`),
            not(
              sql`${user.id} in (
                select ${squadGroupInvitation.invitedUserId}
                from ${squadGroupInvitation}
                where ${squadGroupInvitation.squadGroupId} = ${groupIdNumber}
                  and ${squadGroupInvitation.status} in ('pending', 'accepted')
              )`
            )
          )
        )
        .orderBy(user.name)
        .limit(maxResults);
      const rows = yield* persistenceQuery(operation, select);

      const targets: SquadEditorInviteTarget[] = [];

      for (const row of rows) {
        const userId = parseAppUserId(row.userId);

        if (isError(userId)) {
          return yield* failPersistence(operation, userId.error);
        }

        targets.push({
          image: row.image,
          name: row.name,
          userId: userId.value,
        });
      }

      return targets;
    });

const findVerifiedSquadEditorInviteTargetWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    targetUserId,
  }: {
    readonly targetUserId: AppUserId;
  }): Effect.Effect<
    SquadEditorInviteTarget,
    | SquadEditorInviteTargetNotFound
    | SquadEditorInviteTargetNotVerified
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* findVerifiedSquadEditorInviteTargetEffect() {
      const operation = "findVerifiedSquadEditorInviteTarget" as const;
      const select = database
        .select({
          image: user.image,
          name: user.name,
          userId: user.id,
          verified: user.verified,
        })
        .from(user)
        .where(eq(user.id, appUserIdToString(targetUserId)))
        .limit(1);
      const rows = yield* persistenceQuery(operation, select);

      const [target] = rows;

      if (target === undefined) {
        return yield* new SquadEditorInviteTargetNotFound();
      }

      if (!target.verified) {
        return yield* new SquadEditorInviteTargetNotVerified();
      }

      const userId = yield* parsePersistedAppUserId(operation, target.userId);

      return {
        image: target.image,
        name: target.name,
        userId,
      };
    });

const loadSquadGroupInvitationSummaryWithDatabase =
  (database: EffectPgDatabase) =>
  (
    invitationId: SquadGroupInvitationId,
    operation: EffectSquadGroupPersistenceOperation
  ): Effect.Effect<
    SquadGroupInvitationSummary,
    SquadGroupInvitationNotFound | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* loadSquadGroupInvitationSummaryEffect() {
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
        .where(
          eq(
            squadGroupInvitation.id,
            squadGroupInvitationIdToNumber(invitationId)
          )
        )
        .limit(1);
      const rows = yield* persistenceQuery(operation, select);

      const [row] = rows;

      if (row === undefined) {
        return yield* new SquadGroupInvitationNotFound();
      }

      const status = parseSquadGroupInvitationStatus(row.status);

      if (isError(status)) {
        return yield* failPersistence(operation, status.error);
      }

      const persistedInvitationId = parseSquadGroupInvitationId(
        row.invitationId
      );

      if (isError(persistedInvitationId)) {
        return yield* failPersistence(operation, persistedInvitationId.error);
      }

      const persistedGroupId = parseSquadGroupId(row.squadGroupId);

      if (isError(persistedGroupId)) {
        return yield* failPersistence(operation, persistedGroupId.error);
      }

      const squadGroupName = yield* parsePersistedSquadGroupName(
        operation,
        row.squadGroupName
      );
      const ownerUserId = yield* parsePersistedAppUserId(
        operation,
        row.ownerId
      );

      return {
        createdAt: row.createdAt,
        invitationId: persistedInvitationId.value,
        ownerUserId,
        ownerUserImage: row.ownerImage,
        ownerUserName: row.ownerName,
        squadGroupId: persistedGroupId.value,
        squadGroupName,
        status: status.value,
        updatedAt: row.updatedAt,
      };
    });

const upsertSquadGroupEditorInviteWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    groupId,
    invitedUserId,
    now,
    ownerUserId,
  }: UpsertSquadGroupEditorInviteInput): Effect.Effect<
    SquadGroupInvitationSummary,
    | SquadGroupInvitationTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* upsertSquadGroupEditorInviteEffect() {
      const operation = "upsertSquadGroupEditorInvite" as const;
      const groupIdNumber = squadGroupIdToNumber(groupId);
      const invitedUser = appUserIdToString(invitedUserId);
      const owner = appUserIdToString(ownerUserId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* upsertSquadGroupEditorInviteTransaction() {
          const existingSelect = tx
            .select({
              id: squadGroupInvitation.id,
              status: squadGroupInvitation.status,
            })
            .from(squadGroupInvitation)
            .where(
              and(
                eq(squadGroupInvitation.squadGroupId, groupIdNumber),
                eq(squadGroupInvitation.invitedUserId, invitedUser)
              )
            )
            .limit(1);
          const existingRows = yield* persistenceQueryUnsafe(existingSelect);

          const [existing] = existingRows;

          if (existing === undefined) {
            const insert = tx
              .insert(squadGroupInvitation)
              .values({
                invitedByUserId: owner,
                invitedUserId: invitedUser,
                squadGroupId: groupIdNumber,
                status: "pending",
              })
              .returning({ id: squadGroupInvitation.id });
            const insertedRows = yield* persistenceQueryUnsafe(insert);

            const [inserted] = insertedRows;

            if (inserted === undefined) {
              return yield* failPersistence(
                operation,
                new Error("Failed to insert squad group invitation")
              );
            }

            return inserted.id;
          }

          const status = parseSquadGroupInvitationStatus(existing.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          if (!canTransitionSquadGroupInvitation(status.value, "pending")) {
            return new SquadGroupInvitationTransitionNotAllowed({
              attempted: "pending",
              currentStatus: status.value,
            });
          }

          const update = tx
            .update(squadGroupInvitation)
            .set({ invitedByUserId: owner, status: "pending", updatedAt: now })
            .where(eq(squadGroupInvitation.id, existing.id))
            .returning({ id: squadGroupInvitation.id });
          const updatedRows = yield* persistenceQueryUnsafe(update);

          const [updated] = updatedRows;

          if (updated === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to re-send squad group editor invite")
            );
          }

          return updated.id;
        })
      );
      const upserted = yield* persistenceQuery(operation, transaction);

      if (typeof upserted !== "number") {
        return yield* upserted;
      }

      const invitationId = parseSquadGroupInvitationId(upserted);

      if (isError(invitationId)) {
        return yield* failPersistence(operation, invitationId.error);
      }

      return yield* loadSquadGroupInvitationSummaryWithDatabase(database)(
        invitationId.value,
        operation
      ).pipe(
        Effect.catchTag("SquadGroupInvitationNotFound", (error) =>
          failPersistence(operation, error)
        )
      );
    });

const respondToSquadGroupInviteWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    invitationId,
    invitedUserId,
    now,
    response,
  }: RespondToSquadGroupInviteStoreInput): Effect.Effect<
    SquadGroupInvitationSummary,
    | SquadGroupInvitationNotFound
    | ActorIsNotSquadGroupInviteRecipient
    | SquadGroupInvitationTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* respondToSquadGroupInviteEffect() {
      const operation = "respondToSquadGroupInvite" as const;
      const invitedUser = appUserIdToString(invitedUserId);
      const invitationIdNumber = squadGroupInvitationIdToNumber(invitationId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* respondToSquadGroupInviteTransaction() {
          const existingSelect = tx
            .select({
              id: squadGroupInvitation.id,
              invitedUserId: squadGroupInvitation.invitedUserId,
              status: squadGroupInvitation.status,
            })
            .from(squadGroupInvitation)
            .where(eq(squadGroupInvitation.id, invitationIdNumber))
            .limit(1);
          const existingRows = yield* persistenceQueryUnsafe(existingSelect);

          const [existing] = existingRows;

          if (existing === undefined) {
            return new SquadGroupInvitationNotFound();
          }

          if (existing.invitedUserId !== invitedUser) {
            return new ActorIsNotSquadGroupInviteRecipient();
          }

          const status = parseSquadGroupInvitationStatus(existing.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          const nextStatus: SquadGroupInvitationStatus =
            response === "accept" ? "accepted" : "declined";

          if (!canTransitionSquadGroupInvitation(status.value, nextStatus)) {
            return new SquadGroupInvitationTransitionNotAllowed({
              attempted: nextStatus,
              currentStatus: status.value,
            });
          }

          const update = tx
            .update(squadGroupInvitation)
            .set({ status: nextStatus, updatedAt: now })
            .where(eq(squadGroupInvitation.id, existing.id))
            .returning({ id: squadGroupInvitation.id });
          const updatedRows = yield* persistenceQueryUnsafe(update);

          const [updated] = updatedRows;

          if (updated === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to update squad group invitation")
            );
          }

          return { _tag: "Updated" as const };
        })
      );
      const respond = yield* persistenceQuery(operation, transaction);

      if (respond._tag !== "Updated") {
        return yield* respond;
      }

      return yield* loadSquadGroupInvitationSummaryWithDatabase(database)(
        invitationId,
        operation
      );
    });

const revokeSquadGroupEditorWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    invitationId,
    now,
    ownerUserId,
  }: RevokeSquadGroupEditorStoreInput): Effect.Effect<
    SquadGroupInvitationSummary,
    | SquadGroupInvitationNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadGroupInvitationTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* revokeSquadGroupEditorEffect() {
      const operation = "revokeSquadGroupEditor" as const;
      const owner = appUserIdToString(ownerUserId);
      const invitationIdNumber = squadGroupInvitationIdToNumber(invitationId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* revokeSquadGroupEditorTransaction() {
          const existingSelect = tx
            .select({
              ownerUserId: squadGroup.ownerUserId,
              status: squadGroupInvitation.status,
            })
            .from(squadGroupInvitation)
            .innerJoin(
              squadGroup,
              eq(squadGroup.id, squadGroupInvitation.squadGroupId)
            )
            .where(eq(squadGroupInvitation.id, invitationIdNumber))
            .limit(1);
          const existingRows = yield* persistenceQueryUnsafe(existingSelect);

          const [existing] = existingRows;

          if (existing === undefined) {
            return new SquadGroupInvitationNotFound();
          }

          if (existing.ownerUserId !== owner) {
            return new ActorDoesNotOwnSquadGroup();
          }

          const status = parseSquadGroupInvitationStatus(existing.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          if (!canTransitionSquadGroupInvitation(status.value, "revoked")) {
            return new SquadGroupInvitationTransitionNotAllowed({
              attempted: "revoked",
              currentStatus: status.value,
            });
          }

          const update = tx
            .update(squadGroupInvitation)
            .set({ status: "revoked", updatedAt: now })
            .where(eq(squadGroupInvitation.id, invitationIdNumber))
            .returning({ id: squadGroupInvitation.id });
          const updatedRows = yield* persistenceQueryUnsafe(update);

          const [updated] = updatedRows;

          if (updated === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to revoke squad group editor invite")
            );
          }

          return { _tag: "Revoked" as const };
        })
      );
      const revoked = yield* persistenceQuery(operation, transaction);

      if (revoked._tag !== "Revoked") {
        return yield* revoked;
      }

      return yield* loadSquadGroupInvitationSummaryWithDatabase(database)(
        invitationId,
        operation
      );
    });

const findOwnedAccountForSharingWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
  }: FindOwnedAccountForSharingInput): Effect.Effect<
    OwnedAccountForSharing,
    MargonemAccountNotFound | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* findOwnedAccountForSharingEffect() {
      const operation = "findOwnedAccountForSharing" as const;
      const select = database
        .select({
          displayName: margonemAccount.displayName,
          ownerUserId: margonemAccount.ownerUserId,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccount)
        .where(eq(margonemAccount.id, margonemAccountIdToNumber(accountId)))
        .limit(1);
      const rows = yield* persistenceQuery(operation, select);

      const [account] = rows;

      if (account === undefined) {
        return yield* new MargonemAccountNotFound();
      }

      const displayName = parseAccountDisplayName(account.displayName);

      if (isError(displayName)) {
        return yield* failPersistence(operation, displayName.error);
      }

      const ownerUserId = parseAppUserId(account.ownerUserId);

      if (isError(ownerUserId)) {
        return yield* failPersistence(operation, ownerUserId.error);
      }

      const profileId = parseMargonemProfileId(account.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      return {
        accountId,
        displayName: displayName.value,
        ownerUserId: ownerUserId.value,
        profileId: profileId.value,
      };
    });

const loadAccountAccessInviteSummaryWithDatabase =
  (database: EffectPgDatabase) =>
  (
    accessId: MargonemAccountAccessId,
    operation: EffectSquadGroupPersistenceOperation
  ): Effect.Effect<
    AccountAccessInviteSummary,
    AccountAccessInviteNotFound | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* loadAccountAccessInviteSummaryEffect() {
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

      const status = parseAccountAccessStatus(row.status);

      if (isError(status)) {
        return yield* failPersistence(operation, status.error);
      }

      const accountDisplayName = parseAccountDisplayName(
        row.accountDisplayName
      );

      if (isError(accountDisplayName)) {
        return yield* failPersistence(operation, accountDisplayName.error);
      }

      const accountId = parseMargonemAccountId(row.accountId);

      if (isError(accountId)) {
        return yield* failPersistence(operation, accountId.error);
      }

      const profileId = parseMargonemProfileId(row.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      const invitedUserId = yield* parsePersistedAppUserId(
        operation,
        row.invitedUserId
      );
      const ownerUserId = yield* parsePersistedAppUserId(
        operation,
        row.ownerId
      );

      return {
        accessId,
        accountDisplayName: accountDisplayName.value,
        accountId: accountId.value,
        createdAt: row.createdAt,
        generatedProfileUrl: toMargonemProfileUrl(profileId.value),
        invitedUserId,
        ownerUserId,
        ownerUserImage: row.ownerImage,
        ownerUserName: row.ownerName,
        status: status.value,
        updatedAt: row.updatedAt,
      };
    });

const findVerifiedInviteTargetWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    targetUserId,
  }: {
    readonly targetUserId: AppUserId;
  }): Effect.Effect<
    AccountInviteTarget,
    | InviteTargetNotFound
    | InviteTargetNotVerified
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* findVerifiedInviteTargetEffect() {
      const operation = "findVerifiedInviteTarget" as const;
      const select = database
        .select({
          image: user.image,
          name: user.name,
          userId: user.id,
          verified: user.verified,
        })
        .from(user)
        .where(eq(user.id, appUserIdToString(targetUserId)))
        .limit(1);
      const rows = yield* persistenceQuery(operation, select);

      const [target] = rows;

      if (target === undefined) {
        return yield* new InviteTargetNotFound();
      }

      if (!target.verified) {
        return yield* new InviteTargetNotVerified();
      }

      const userId = yield* parsePersistedAppUserId(operation, target.userId);

      return {
        image: target.image,
        name: target.name,
        userId,
      };
    });

const upsertAccountAccessInviteWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
    invitedUserId,
    now,
    ownerUserId,
  }: {
    readonly accountId: MargonemAccountId;
    readonly ownerUserId: AppUserId;
    readonly invitedUserId: AppUserId;
    readonly now: Date;
  }): Effect.Effect<
    AccountAccessInviteSummary,
    | AccountAccessTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* upsertAccountAccessInviteEffect() {
      const operation = "upsertAccountAccessInvite" as const;
      const accountIdNumber = margonemAccountIdToNumber(accountId);
      const invitedUser = appUserIdToString(invitedUserId);
      const owner = appUserIdToString(ownerUserId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* upsertAccountAccessInviteTransaction() {
          const existingSelect = tx
            .select({
              id: margonemAccountAccess.id,
              status: margonemAccountAccess.status,
            })
            .from(margonemAccountAccess)
            .where(
              and(
                eq(margonemAccountAccess.accountId, accountIdNumber),
                eq(margonemAccountAccess.userId, invitedUser)
              )
            )
            .limit(1);
          const existingRows = yield* persistenceQueryUnsafe(existingSelect);

          const [existing] = existingRows;

          if (existing === undefined) {
            const insert = tx
              .insert(margonemAccountAccess)
              .values({
                accountId: accountIdNumber,
                invitedByUserId: owner,
                status: "pending",
                userId: invitedUser,
              })
              .returning({ id: margonemAccountAccess.id });
            const insertedRows = yield* persistenceQueryUnsafe(insert);

            const [inserted] = insertedRows;

            if (inserted === undefined) {
              return yield* failPersistence(
                operation,
                new Error("Failed to insert account access invite")
              );
            }

            return inserted.id;
          }

          const status = parseAccountAccessStatus(existing.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          if (!canTransitionAccountAccess(status.value, "pending")) {
            return new AccountAccessTransitionNotAllowed({
              attempted: "pending",
              currentStatus: status.value,
            });
          }

          const update = tx
            .update(margonemAccountAccess)
            .set({ invitedByUserId: owner, status: "pending", updatedAt: now })
            .where(eq(margonemAccountAccess.id, existing.id))
            .returning({ id: margonemAccountAccess.id });
          const updatedRows = yield* persistenceQueryUnsafe(update);

          const [updated] = updatedRows;

          if (updated === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to re-send account access invite")
            );
          }

          return updated.id;
        })
      );
      const upserted = yield* persistenceQuery(operation, transaction);

      if (typeof upserted !== "number") {
        return yield* upserted;
      }

      const accessId = parseMargonemAccountAccessId(upserted);

      if (isError(accessId)) {
        return yield* failPersistence(operation, accessId.error);
      }

      const summary = yield* loadAccountAccessInviteSummaryWithDatabase(
        database
      )(accessId.value, operation).pipe(
        Effect.catchTag("AccountAccessInviteNotFound", (error) =>
          failPersistence(operation, error)
        )
      );

      return summary;
    });

const listIncomingAccountInvitesWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListIncomingAccountInvitesInput): Effect.Effect<
    readonly AccountAccessInviteSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listIncomingAccountInvitesEffect() {
      const operation = "listIncomingAccountInvites" as const;
      const select = database
        .select({ id: margonemAccountAccess.id })
        .from(margonemAccountAccess)
        .where(
          and(
            eq(margonemAccountAccess.userId, appUserIdToString(actorUserId)),
            eq(margonemAccountAccess.status, "pending")
          )
        )
        .orderBy(desc(margonemAccountAccess.createdAt));
      const rows = yield* persistenceQuery(operation, select);

      const invites: AccountAccessInviteSummary[] = [];

      for (const row of rows) {
        const accessId = parseMargonemAccountAccessId(row.id);

        if (isError(accessId)) {
          return yield* failPersistence(operation, accessId.error);
        }

        const summary = yield* loadAccountAccessInviteSummaryWithDatabase(
          database
        )(accessId.value, operation).pipe(
          Effect.catchTag("AccountAccessInviteNotFound", (error) =>
            failPersistence(operation, error)
          )
        );

        invites.push(summary);
      }

      return invites;
    });

const listSharedAccountsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListSharedAccountsInput): Effect.Effect<
    readonly SharedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listSharedAccountsEffect() {
      const operation = "listSharedAccounts" as const;
      const select = database
        .select({
          accountId: margonemAccount.id,
          characterCount: sql<number>`count(${margonemCharacter.id})::int`.as(
            "character_count"
          ),
          createdAt: margonemAccount.createdAt,
          displayName: margonemAccount.displayName,
          lastFetchedAt: margonemAccount.lastFetchedAt,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccountAccess)
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemAccountAccess.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .leftJoin(
          margonemCharacter,
          eq(margonemCharacter.accountId, margonemAccount.id)
        )
        .where(
          and(
            eq(margonemAccountAccess.userId, appUserIdToString(actorUserId)),
            eq(margonemAccountAccess.status, "accepted")
          )
        )
        .groupBy(margonemAccount.id, user.id)
        .orderBy(desc(margonemAccount.createdAt), desc(margonemAccount.id));
      const rows = yield* persistenceQuery(operation, select);

      const accounts: SharedMargonemAccountSummary[] = [];

      for (const row of rows) {
        const accountId = parseMargonemAccountId(row.accountId);

        if (isError(accountId)) {
          return yield* failPersistence(operation, accountId.error);
        }

        const displayName = parseAccountDisplayName(row.displayName);

        if (isError(displayName)) {
          return yield* failPersistence(operation, displayName.error);
        }

        const profileId = parseMargonemProfileId(row.profileId);

        if (isError(profileId)) {
          return yield* failPersistence(operation, profileId.error);
        }

        const ownerUserId = parseAppUserId(row.ownerId);

        if (isError(ownerUserId)) {
          return yield* failPersistence(operation, ownerUserId.error);
        }

        accounts.push({
          accountId: accountId.value,
          characterCount: row.characterCount ?? 0,
          displayName: displayName.value,
          generatedProfileUrl: toMargonemProfileUrl(profileId.value),
          lastFetchedAt: row.lastFetchedAt ?? row.createdAt,
          ownerUserId: ownerUserId.value,
          ownerUserImage: row.ownerImage,
          ownerUserName: row.ownerName,
          profileId: profileId.value,
        });
      }

      return accounts;
    });

const listAccountAccessGrantsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
  }: {
    readonly accountId: MargonemAccountId;
  }): Effect.Effect<
    readonly AccountAccessGrantSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listAccountAccessGrantsEffect() {
      const operation = "listAccountAccessGrants" as const;
      const select = database
        .select({
          accessId: margonemAccountAccess.id,
          createdAt: margonemAccountAccess.createdAt,
          image: user.image,
          name: user.name,
          status: margonemAccountAccess.status,
          updatedAt: margonemAccountAccess.updatedAt,
          userId: user.id,
        })
        .from(margonemAccountAccess)
        .innerJoin(user, eq(user.id, margonemAccountAccess.userId))
        .where(
          and(
            eq(
              margonemAccountAccess.accountId,
              margonemAccountIdToNumber(accountId)
            ),
            inArray(margonemAccountAccess.status, ["pending", "accepted"])
          )
        )
        .orderBy(desc(margonemAccountAccess.createdAt));
      const rows = yield* persistenceQuery(operation, select);

      const grants: AccountAccessGrantSummary[] = [];

      for (const row of rows) {
        const status = parseAccountAccessStatus(row.status);

        if (isError(status)) {
          return yield* failPersistence(operation, status.error);
        }

        if (status.value !== "pending" && status.value !== "accepted") {
          return yield* failPersistence(
            operation,
            new Error(`Unexpected account access status: ${status.value}`)
          );
        }

        const accessId = parseMargonemAccountAccessId(row.accessId);

        if (isError(accessId)) {
          return yield* failPersistence(operation, accessId.error);
        }

        const invitedUserId = yield* parsePersistedAppUserId(
          operation,
          row.userId
        );

        grants.push({
          accessId: accessId.value,
          createdAt: row.createdAt,
          invitedUserId,
          invitedUserImage: row.image,
          invitedUserName: row.name,
          status: status.value,
          updatedAt: row.updatedAt,
        });
      }

      return grants;
    });

const listIncomingSquadGroupInvitesWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
  }): Effect.Effect<
    readonly SquadGroupInvitationSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listIncomingSquadGroupInvitesEffect() {
      const operation = "listIncomingSquadGroupInvites" as const;
      const select = database
        .select({ id: squadGroupInvitation.id })
        .from(squadGroupInvitation)
        .where(
          and(
            eq(
              squadGroupInvitation.invitedUserId,
              appUserIdToString(actorUserId)
            ),
            eq(squadGroupInvitation.status, "pending")
          )
        )
        .orderBy(desc(squadGroupInvitation.createdAt));
      const rows = yield* persistenceQuery(operation, select);

      const invites: SquadGroupInvitationSummary[] = [];

      for (const row of rows) {
        const invitationId = parseSquadGroupInvitationId(row.id);

        if (isError(invitationId)) {
          return yield* failPersistence(operation, invitationId.error);
        }

        const summary = yield* loadSquadGroupInvitationSummaryWithDatabase(
          database
        )(invitationId.value, operation).pipe(
          Effect.catchTag("SquadGroupInvitationNotFound", (error) =>
            failPersistence(operation, error)
          )
        );

        invites.push(summary);
      }

      return invites;
    });

const getPendingSquadGroupInviteCountWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
  }): Effect.Effect<number, EffectSquadBuilderPersistenceUnavailable, never> =>
    Effect.gen(function* getPendingSquadGroupInviteCountEffect() {
      const operation = "getPendingSquadGroupInviteCount" as const;
      const select = database
        .select({ inviteCount: count() })
        .from(squadGroupInvitation)
        .where(
          and(
            eq(
              squadGroupInvitation.invitedUserId,
              appUserIdToString(actorUserId)
            ),
            eq(squadGroupInvitation.status, "pending")
          )
        );
      const rows = yield* persistenceQuery(operation, select);

      return rows[0]?.inviteCount ?? 0;
    });

const listSquadGroupEditorGrantsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    groupId,
  }: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupSummary["groupId"];
  }): Effect.Effect<
    readonly SquadGroupEditorGrantSummary[],
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listSquadGroupEditorGrantsEffect() {
      const operation = "listSquadGroupEditorGrants" as const;
      yield* authorizeSquadGroupOwnerWithDatabase(database)({
        actorUserId,
        groupId,
      });

      const select = database
        .select({
          createdAt: squadGroupInvitation.createdAt,
          image: user.image,
          invitationId: squadGroupInvitation.id,
          name: user.name,
          status: squadGroupInvitation.status,
          updatedAt: squadGroupInvitation.updatedAt,
          userId: user.id,
        })
        .from(squadGroupInvitation)
        .innerJoin(user, eq(user.id, squadGroupInvitation.invitedUserId))
        .where(
          and(
            eq(
              squadGroupInvitation.squadGroupId,
              squadGroupIdToNumber(groupId)
            ),
            inArray(squadGroupInvitation.status, ["pending", "accepted"])
          )
        )
        .orderBy(desc(squadGroupInvitation.createdAt));
      const rows = yield* persistenceQuery(operation, select);

      const grants: SquadGroupEditorGrantSummary[] = [];

      for (const row of rows) {
        const status = parseSquadGroupInvitationStatus(row.status);

        if (isError(status)) {
          return yield* failPersistence(operation, status.error);
        }

        if (status.value !== "pending" && status.value !== "accepted") {
          return yield* failPersistence(
            operation,
            new Error(
              `Unexpected squad group invitation status: ${status.value}`
            )
          );
        }

        const invitationId = parseSquadGroupInvitationId(row.invitationId);

        if (isError(invitationId)) {
          return yield* failPersistence(operation, invitationId.error);
        }

        const userId = yield* parsePersistedAppUserId(operation, row.userId);

        grants.push({
          createdAt: row.createdAt,
          invitationId: invitationId.value,
          status: status.value,
          updatedAt: row.updatedAt,
          userId,
          userImage: row.image,
          userName: row.name,
        });
      }

      return grants;
    });

const respondToAccountAccessInviteWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accessId,
    invitedUserId,
    now,
    response,
  }: RespondToAccountAccessInviteStoreInput): Effect.Effect<
    AccountAccessInviteSummary,
    | AccountAccessInviteNotFound
    | ActorIsNotInviteRecipient
    | AccountAccessTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* respondToAccountAccessInviteEffect() {
      const operation = "respondToAccountAccessInvite" as const;
      const invitedUser = appUserIdToString(invitedUserId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* respondToAccountAccessInviteTransaction() {
          const existingSelect = tx
            .select({
              id: margonemAccountAccess.id,
              status: margonemAccountAccess.status,
              userId: margonemAccountAccess.userId,
            })
            .from(margonemAccountAccess)
            .where(eq(margonemAccountAccess.id, accessId))
            .limit(1);
          const existingRows = yield* persistenceQueryUnsafe(existingSelect);

          const [existing] = existingRows;

          if (existing === undefined) {
            return new AccountAccessInviteNotFound();
          }

          if (existing.userId !== invitedUser) {
            return new ActorIsNotInviteRecipient();
          }

          const status = parseAccountAccessStatus(existing.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          const nextStatus: AccountAccessStatus =
            response === "accept" ? "accepted" : "declined";

          if (!canTransitionAccountAccess(status.value, nextStatus)) {
            return new AccountAccessTransitionNotAllowed({
              attempted: nextStatus,
              currentStatus: status.value,
            });
          }

          const update = tx
            .update(margonemAccountAccess)
            .set({ status: nextStatus, updatedAt: now })
            .where(eq(margonemAccountAccess.id, existing.id))
            .returning({ id: margonemAccountAccess.id });
          const updatedRows = yield* persistenceQueryUnsafe(update);

          const [updated] = updatedRows;

          if (updated === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to update account access invite")
            );
          }

          return { _tag: "Updated" as const };
        })
      );
      const respond = yield* persistenceQuery(operation, transaction);

      if (respond._tag !== "Updated") {
        return yield* respond;
      }

      return yield* loadAccountAccessInviteSummaryWithDatabase(database)(
        accessId,
        operation
      );
    });

const revokeAccountAccessWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accessId,
    now,
    ownerUserId,
  }: RevokeAccountAccessStoreInput): Effect.Effect<
    RevokeAccountAccessResult,
    | AccountAccessInviteNotFound
    | ActorDoesNotOwnMargonemAccount
    | AccountAccessTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* revokeAccountAccessEffect() {
      const operation = "revokeAccountAccess" as const;
      const accessIdNumber = margonemAccountAccessIdToNumber(accessId);
      const owner = appUserIdToString(ownerUserId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* revokeAccountAccessTransaction() {
          const accessSelect = tx
            .select({
              accountId: margonemAccountAccess.accountId,
              status: margonemAccountAccess.status,
              userId: margonemAccountAccess.userId,
            })
            .from(margonemAccountAccess)
            .where(eq(margonemAccountAccess.id, accessIdNumber))
            .limit(1);
          const accessRows = yield* persistenceQueryUnsafe(accessSelect);

          const [access] = accessRows;

          if (access === undefined) {
            return new AccountAccessInviteNotFound();
          }

          const accountSelect = tx
            .select({ ownerUserId: margonemAccount.ownerUserId })
            .from(margonemAccount)
            .where(eq(margonemAccount.id, access.accountId))
            .limit(1);
          const accountRows = yield* persistenceQueryUnsafe(accountSelect);

          const [account] = accountRows;

          if (account === undefined) {
            return new AccountAccessInviteNotFound();
          }

          if (account.ownerUserId !== owner) {
            return new ActorDoesNotOwnMargonemAccount();
          }

          const status = parseAccountAccessStatus(access.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          if (!canTransitionAccountAccess(status.value, "revoked")) {
            return new AccountAccessTransitionNotAllowed({
              attempted: "revoked",
              currentStatus: status.value,
            });
          }

          yield* persistenceQueryUnsafe(
            tx
              .update(margonemAccountAccess)
              .set({ status: "revoked", updatedAt: now })
              .where(eq(margonemAccountAccess.id, accessIdNumber))
          );

          let removedSquadCharacterCount = 0;

          if (status.value === "accepted") {
            const characterSelect = tx
              .select({ id: margonemCharacter.id })
              .from(margonemCharacter)
              .where(eq(margonemCharacter.accountId, access.accountId));
            const accountCharacters =
              yield* persistenceQueryUnsafe(characterSelect);

            const accountCharacterIds = accountCharacters.map(
              (character) => character.id
            );

            if (accountCharacterIds.length > 0) {
              const affectedGroupSelect = tx
                .select({ groupId: squadCharacter.squadGroupId })
                .from(squadCharacter)
                .innerJoin(
                  squadGroup,
                  eq(squadGroup.id, squadCharacter.squadGroupId)
                )
                .where(
                  and(
                    inArray(squadCharacter.characterId, accountCharacterIds),
                    eq(squadGroup.ownerUserId, access.userId)
                  )
                );
              const affectedGroups =
                yield* persistenceQueryUnsafe(affectedGroupSelect);

              const affectedGroupIds = [
                ...new Set(affectedGroups.map((group) => group.groupId)),
              ];

              if (affectedGroupIds.length > 0) {
                const removedPlacementsDelete = tx
                  .delete(squadCharacter)
                  .where(
                    and(
                      inArray(squadCharacter.characterId, accountCharacterIds),
                      inArray(squadCharacter.squadGroupId, affectedGroupIds)
                    )
                  )
                  .returning({ id: squadCharacter.id });
                const removedPlacements = yield* persistenceQueryUnsafe(
                  removedPlacementsDelete
                );

                removedSquadCharacterCount = removedPlacements.length;

                yield* persistenceQueryUnsafe(
                  tx
                    .update(squadGroup)
                    .set({ updatedAt: now })
                    .where(inArray(squadGroup.id, affectedGroupIds))
                );
              }
            }
          }

          return {
            _tag: "Revoked" as const,
            accountId: access.accountId,
            removedSquadCharacterCount,
            revokedUserId: access.userId,
          };
        })
      );
      const revoked = yield* persistenceQuery(operation, transaction);

      if (revoked._tag !== "Revoked") {
        return yield* revoked;
      }

      const accountId = parseMargonemAccountId(revoked.accountId);

      if (isError(accountId)) {
        return yield* failPersistence(operation, accountId.error);
      }

      const revokedUserId = yield* parsePersistedAppUserId(
        operation,
        revoked.revokedUserId
      );

      return {
        accessId,
        accountId: accountId.value,
        removedSquadCharacterCount: revoked.removedSquadCharacterCount,
        revokedUserId,
      };
    });

const listAvailableCharactersForOwnerWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    ownerUserId,
  }: ListAvailableCharactersForOwnerInput): Effect.Effect<
    readonly AvailableSquadCharacter[],
    EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* listAvailableCharactersForOwnerEffect() {
      const operation = "listAvailableCharactersForOwner" as const;
      const owner = appUserIdToString(ownerUserId);
      const select = database
        .select({
          accountDisplayName: margonemAccount.displayName,
          accountId: margonemAccount.id,
          accountOwnerUserId: margonemAccount.ownerUserId,
          accountOwnerUserImage: user.image,
          accountOwnerUserName: user.name,
          avatarUrl: margonemCharacter.avatarUrl,
          characterId: margonemCharacter.id,
          level: margonemCharacter.level,
          margonemCharacterId: margonemCharacter.characterId,
          name: margonemCharacter.name,
          profession: margonemCharacter.profession,
          world: margonemCharacter.world,
        })
        .from(margonemCharacter)
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemCharacter.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .leftJoin(
          margonemAccountAccess,
          and(
            eq(margonemAccountAccess.accountId, margonemAccount.id),
            eq(margonemAccountAccess.userId, owner),
            eq(margonemAccountAccess.status, "accepted")
          )
        )
        .where(
          and(
            eq(margonemCharacter.world, "jaruna"),
            sql`(${margonemAccount.ownerUserId} = ${owner} or ${margonemAccountAccess.id} is not null)`
          )
        )
        .orderBy(
          asc(margonemAccount.displayName),
          asc(margonemCharacter.level)
        );
      const rows = yield* persistenceQuery(operation, select);

      const characters: AvailableSquadCharacter[] = [];

      for (const row of rows) {
        const accountDisplayName = parseAccountDisplayName(
          row.accountDisplayName
        );

        if (isError(accountDisplayName)) {
          return yield* failPersistence(operation, accountDisplayName.error);
        }

        const accountId = parseMargonemAccountId(row.accountId);

        if (isError(accountId)) {
          return yield* failPersistence(operation, accountId.error);
        }

        const accountOwnerUserId = parseAppUserId(row.accountOwnerUserId);

        if (isError(accountOwnerUserId)) {
          return yield* failPersistence(operation, accountOwnerUserId.error);
        }

        const level = parsePositiveLevel(row.level);

        if (isError(level)) {
          return yield* failPersistence(operation, level.error);
        }

        const profession = parseMargonemProfession(row.profession);

        if (isError(profession)) {
          return yield* failPersistence(operation, profession.error);
        }

        const world = parseMargonemWorld(row.world);

        if (isError(world)) {
          return yield* failPersistence(operation, world.error);
        }

        const margonemCharacterId = parseMargonemCharacterId(
          row.margonemCharacterId
        );

        if (isError(margonemCharacterId)) {
          return yield* failPersistence(operation, margonemCharacterId.error);
        }

        characters.push({
          accountDisplayName: accountDisplayName.value,
          accountId: accountId.value,
          accountOwnerUserId: accountOwnerUserId.value,
          accountOwnerUserImage: row.accountOwnerUserImage,
          accountOwnerUserName: row.accountOwnerUserName,
          avatarUrl: row.avatarUrl,
          characterId: row.characterId,
          level: level.value,
          margonemCharacterId: margonemCharacterId.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        });
      }

      return characters;
    });

const getSquadGroupDetailWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    groupId,
  }: GetSquadGroupDetailInput): Effect.Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotViewSquadGroup
    | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* getSquadGroupDetailEffect() {
      const operation = "getSquadGroupDetail" as const;
      const groupIdNumber = squadGroupIdToNumber(groupId);
      const actor = appUserIdToString(actorUserId);
      const groupSelect = database
        .select({
          name: squadGroup.name,
          ownerUserId: squadGroup.ownerUserId,
          updatedAt: squadGroup.updatedAt,
          visibility: squadGroup.visibility,
        })
        .from(squadGroup)
        .where(eq(squadGroup.id, groupIdNumber))
        .limit(1);
      const groupRows = yield* persistenceQuery(operation, groupSelect);

      const [group] = groupRows;

      if (group === undefined) {
        return yield* new SquadGroupNotFound();
      }

      const ownerUserId = yield* parsePersistedAppUserId(
        operation,
        group.ownerUserId
      );
      const groupName = yield* parsePersistedSquadGroupName(
        operation,
        group.name
      );
      const visibility = parseSquadGroupVisibility(group.visibility);

      if (isError(visibility)) {
        return yield* failPersistence(operation, visibility.error);
      }

      let access: SquadGroupAccess;

      if (group.ownerUserId === actor) {
        access = {
          _tag: "SquadGroupOwnerAccess",
          groupId,
          ownerUserId: actorUserId,
          role: "owner",
        };
      } else {
        const inviteSelect = database
          .select({ id: squadGroupInvitation.id })
          .from(squadGroupInvitation)
          .where(
            and(
              eq(squadGroupInvitation.squadGroupId, groupIdNumber),
              eq(squadGroupInvitation.invitedUserId, actor),
              eq(squadGroupInvitation.status, "accepted")
            )
          )
          .limit(1);
        const inviteRows = yield* persistenceQuery(operation, inviteSelect);

        const [invite] = inviteRows;

        if (invite === undefined) {
          if (visibility.value !== "global") {
            return yield* new ActorCannotViewSquadGroup();
          }

          access = {
            _tag: "SquadGroupViewerAccess",
            groupId,
            ownerUserId,
            role: "viewer",
          };
        } else {
          const invitationId = parseSquadGroupInvitationId(invite.id);

          if (isError(invitationId)) {
            return yield* failPersistence(operation, invitationId.error);
          }

          access = {
            _tag: "SquadGroupEditorAccess",
            editorUserId: actorUserId,
            groupId,
            invitationId: invitationId.value,
            ownerUserId,
            role: "editor",
          };
        }
      }

      const squadSelect = database
        .select({
          id: squad.id,
          name: squad.name,
          position: squad.position,
        })
        .from(squad)
        .where(eq(squad.squadGroupId, groupIdNumber))
        .orderBy(asc(squad.position), asc(squad.id));
      const squadRows = yield* persistenceQuery(operation, squadSelect);

      const placementSelect = database
        .select({
          accountDisplayName: margonemAccount.displayName,
          accountId: margonemAccount.id,
          accountOwnerUserImage: user.image,
          accountOwnerUserName: user.name,
          avatarUrl: margonemCharacter.avatarUrl,
          characterId: margonemCharacter.id,
          level: margonemCharacter.level,
          margonemCharacterId: margonemCharacter.characterId,
          name: margonemCharacter.name,
          placementId: squadCharacter.id,
          position: squadCharacter.position,
          profession: margonemCharacter.profession,
          squadId: squadCharacter.squadId,
        })
        .from(squadCharacter)
        .innerJoin(
          margonemCharacter,
          eq(margonemCharacter.id, squadCharacter.characterId)
        )
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemCharacter.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .where(eq(squadCharacter.squadGroupId, groupIdNumber))
        .orderBy(asc(squadCharacter.position), asc(squadCharacter.id));
      const placementRows = yield* persistenceQuery(operation, placementSelect);

      const charactersBySquadId = new Map<number, SquadGroupCharacter[]>();

      for (const placement of placementRows) {
        const current = charactersBySquadId.get(placement.squadId) ?? [];
        const accountDisplayName = parseAccountDisplayName(
          placement.accountDisplayName
        );

        if (isError(accountDisplayName)) {
          return yield* failPersistence(operation, accountDisplayName.error);
        }

        const level = parsePositiveLevel(placement.level);

        if (isError(level)) {
          return yield* failPersistence(operation, level.error);
        }

        const profession = parseMargonemProfession(placement.profession);

        if (isError(profession)) {
          return yield* failPersistence(operation, profession.error);
        }

        const margonemCharacterId = parseMargonemCharacterId(
          placement.margonemCharacterId
        );

        if (isError(margonemCharacterId)) {
          return yield* failPersistence(operation, margonemCharacterId.error);
        }

        current.push({
          accountDisplayName: accountDisplayName.value,
          accountId: placement.accountId as MargonemAccountId,
          accountOwnerUserImage: placement.accountOwnerUserImage,
          accountOwnerUserName: placement.accountOwnerUserName,
          avatarUrl: placement.avatarUrl,
          characterId: placement.characterId,
          level: level.value,
          margonemCharacterId: margonemCharacterId.value,
          name: placement.name,
          placementId: placement.placementId,
          position: placement.position,
          profession: profession.value,
        });
        charactersBySquadId.set(placement.squadId, current);
      }

      const squads = [];

      for (const row of squadRows) {
        const squadId = parseSquadId(row.id);

        if (isError(squadId)) {
          return yield* failPersistence(operation, squadId.error);
        }

        squads.push({
          characters: charactersBySquadId.get(row.id) ?? [],
          name: row.name,
          position: row.position,
          squadId: squadId.value,
        });
      }

      return {
        accessRole: access.role,
        groupId,
        name: groupName,
        ownerUserId,
        squads,
        updatedAt: group.updatedAt,
        visibility: visibility.value,
      };
    });

const buildSquadGroupListFilterPredicates = (
  database: EffectPgDatabase,
  filters: ListGlobalSquadGroupsInput["filters"]
) => {
  const predicates = [];

  if (filters.nameQuery !== undefined) {
    const escapedQuery = escapeLikePattern(
      squadGroupNameQueryToString(filters.nameQuery)
    );
    const namePredicate = or(
      ilike(squadGroup.name, `%${escapedQuery}%`),
      exists(
        database
          .select({ one: sql`1` })
          .from(squad)
          .where(
            and(
              eq(squad.squadGroupId, squadGroup.id),
              ilike(squad.name, `%${escapedQuery}%`)
            )
          )
      )
    );

    if (namePredicate !== undefined) {
      predicates.push(namePredicate);
    }
  }

  if (filters.levelRange._tag === "BoundedLevelRange") {
    const levelPredicates = [eq(squad.squadGroupId, squadGroup.id)];

    if (filters.levelRange.minLevel !== undefined) {
      levelPredicates.push(
        gte(
          margonemCharacter.level,
          squadGroupLevelBoundToNumber(filters.levelRange.minLevel)
        )
      );
    }

    if (filters.levelRange.maxLevel !== undefined) {
      levelPredicates.push(
        lte(
          margonemCharacter.level,
          squadGroupLevelBoundToNumber(filters.levelRange.maxLevel)
        )
      );
    }

    predicates.push(
      exists(
        database
          .select({ one: sql`1` })
          .from(squad)
          .innerJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
          .innerJoin(
            margonemCharacter,
            eq(margonemCharacter.id, squadCharacter.characterId)
          )
          .where(and(...levelPredicates))
      )
    );
  }

  return predicates;
};

const listSharedSquadGroupsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    filters,
  }: {
    readonly actorUserId: AppUserId;
    readonly filters: ListGlobalSquadGroupsInput["filters"];
  }): Effect.Effect<
    readonly SharedSquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* listSharedSquadGroupsEffect() {
      const operation = "listSharedSquadGroups" as const;
      const filterPredicates = buildSquadGroupListFilterPredicates(
        database,
        filters
      );
      const select = database
        .select({
          characterCount: sql<number>`count(distinct ${squadCharacter.id})::int`,
          groupId: squadGroup.id,
          name: squadGroup.name,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          squadCount: sql<number>`count(distinct ${squad.id})::int`,
          updatedAt: squadGroup.updatedAt,
        })
        .from(squadGroupInvitation)
        .innerJoin(
          squadGroup,
          eq(squadGroup.id, squadGroupInvitation.squadGroupId)
        )
        .innerJoin(user, eq(user.id, squadGroup.ownerUserId))
        .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
        .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
        .where(
          and(
            eq(
              squadGroupInvitation.invitedUserId,
              appUserIdToString(actorUserId)
            ),
            eq(squadGroupInvitation.status, "accepted"),
            ...filterPredicates
          )
        )
        .groupBy(squadGroup.id, user.id)
        .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id));
      const rows = yield* persistenceQuery(operation, select);

      const groups: SharedSquadGroupSummary[] = [];

      for (const row of rows) {
        const groupId = parseSquadGroupId(row.groupId);

        if (isError(groupId)) {
          return yield* failPersistence(operation, groupId.error);
        }

        const name = yield* parsePersistedSquadGroupName(operation, row.name);
        const ownerUserId = yield* parsePersistedAppUserId(
          operation,
          row.ownerId
        );

        groups.push({
          characterCount: row.characterCount ?? 0,
          groupId: groupId.value,
          name,
          ownerUserId,
          ownerUserImage: row.ownerImage,
          ownerUserName: row.ownerName,
          squadCount: row.squadCount ?? 0,
          updatedAt: row.updatedAt,
        });
      }

      return groups;
    });

const saveSharedSquadGroupCharactersWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    groupId,
    now,
    snapshot,
  }: SaveSharedSquadGroupCharactersStoreInput): Effect.Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotEditSquadGroup
    | SquadNotInGroup
    | EditorCannotChangeSquadStructure
    | SquadCharacterNotAccessible
    | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* saveSharedSquadGroupCharactersEffect() {
      const operation = "saveSharedSquadGroupCharacters" as const;
      const groupIdNumber = squadGroupIdToNumber(groupId);
      const actor = appUserIdToString(actorUserId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* saveSharedSquadGroupCharactersTransaction() {
          yield* persistenceQueryUnsafe(
            tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNumber}`}))`
            )
          );

          const groupSelect = tx
            .select({ ownerUserId: squadGroup.ownerUserId })
            .from(squadGroup)
            .where(eq(squadGroup.id, groupIdNumber))
            .limit(1);
          const groupRows = yield* persistenceQueryUnsafe(groupSelect);

          const [group] = groupRows;

          if (group === undefined) {
            return new SquadGroupNotFound();
          }

          if (group.ownerUserId !== actor) {
            const inviteSelect = tx
              .select({ id: squadGroupInvitation.id })
              .from(squadGroupInvitation)
              .where(
                and(
                  eq(squadGroupInvitation.squadGroupId, groupIdNumber),
                  eq(squadGroupInvitation.invitedUserId, actor),
                  eq(squadGroupInvitation.status, "accepted")
                )
              )
              .limit(1);
            const inviteRows = yield* persistenceQueryUnsafe(inviteSelect);

            if (inviteRows[0] === undefined) {
              return new ActorCannotEditSquadGroup();
            }
          }

          const existingSquadSelect = tx
            .select({ id: squad.id })
            .from(squad)
            .where(eq(squad.squadGroupId, groupIdNumber));
          const existingSquads =
            yield* persistenceQueryUnsafe(existingSquadSelect);

          const existingSquadIds = new Set(existingSquads.map((row) => row.id));

          if (existingSquadIds.size !== snapshot.squads.length) {
            return new EditorCannotChangeSquadStructure();
          }

          for (const submitted of snapshot.squads) {
            if (!existingSquadIds.has(submitted.squadId)) {
              return new SquadNotInGroup({ squadId: submitted.squadId });
            }
          }

          yield* persistenceQueryUnsafe(
            tx
              .delete(squadCharacter)
              .where(eq(squadCharacter.squadGroupId, groupIdNumber))
          );

          const characterIds = snapshot.squads.flatMap((item) =>
            item.characters.map((character) => character.characterId)
          );
          const charactersById = new Map<
            number,
            { readonly accountId: number }
          >();

          if (characterIds.length > 0) {
            const characterSelect = tx
              .select({
                accountId: margonemCharacter.accountId,
                id: margonemCharacter.id,
              })
              .from(margonemCharacter)
              .where(inArray(margonemCharacter.id, characterIds));
            const characterRows =
              yield* persistenceQueryUnsafe(characterSelect);

            for (const character of characterRows) {
              charactersById.set(character.id, {
                accountId: character.accountId,
              });
            }
          }

          const placements = [];

          for (const submitted of snapshot.squads) {
            for (const character of submitted.characters) {
              const stored = charactersById.get(character.characterId);

              if (stored === undefined) {
                return new SquadCharacterNotAccessible({
                  characterId: character.characterId,
                });
              }

              placements.push({
                accountId: stored.accountId,
                characterId: character.characterId,
                position: character.position,
                squadGroupId: groupIdNumber,
                squadId: submitted.squadId,
              });
            }
          }

          if (placements.length > 0) {
            yield* persistenceQueryUnsafe(
              tx.insert(squadCharacter).values(placements)
            );
          }

          yield* persistenceQueryUnsafe(
            tx
              .update(squadGroup)
              .set({ updatedAt: now })
              .where(eq(squadGroup.id, groupIdNumber))
          );

          return { _tag: "Saved" as const };
        })
      );

      const saved = yield* persistenceQuery(operation, transaction);

      if (saved._tag !== "Saved") {
        return yield* saved;
      }

      return yield* getSquadGroupDetailWithDatabase(database)({
        actorUserId,
        groupId,
      }).pipe(
        Effect.catch(
          (
            error
          ): Effect.Effect<
            never,
            | SquadGroupNotFound
            | ActorCannotEditSquadGroup
            | EffectSquadBuilderPersistenceUnavailable
          > => {
            if (error._tag === "ActorCannotViewSquadGroup") {
              return new ActorCannotEditSquadGroup();
            }

            return Effect.fail(error);
          }
        )
      );
    });

const saveSquadGroupSnapshotWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    availableCharacters,
    now,
    snapshot,
  }: SaveSquadGroupSnapshotStoreInput): Effect.Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* saveSquadGroupSnapshotEffect() {
      const operation = "saveSquadGroupSnapshot" as const;
      const groupIdNumber = squadGroupIdToNumber(snapshot.groupId);
      const availableByCharacterId = new Map<number, AvailableSquadCharacter>();

      for (const character of availableCharacters) {
        availableByCharacterId.set(character.characterId, character);
      }

      const transaction = database.transaction((tx) =>
        Effect.gen(function* saveSquadGroupSnapshotTransaction() {
          yield* persistenceQueryUnsafe(
            tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNumber}`}))`
            )
          );

          const groupSelect = tx
            .select({ ownerUserId: squadGroup.ownerUserId })
            .from(squadGroup)
            .where(eq(squadGroup.id, groupIdNumber))
            .limit(1);
          const groupRows = yield* persistenceQueryUnsafe(groupSelect);

          const [group] = groupRows;

          if (group === undefined) {
            return new SquadGroupNotFound();
          }

          if (group.ownerUserId !== appUserIdToString(actorUserId)) {
            return new ActorDoesNotOwnSquadGroup();
          }

          yield* persistenceQueryUnsafe(
            tx
              .update(squadGroup)
              .set({
                name: squadGroupNameToString(snapshot.name),
                updatedAt: now,
              })
              .where(eq(squadGroup.id, groupIdNumber))
          );

          yield* persistenceQueryUnsafe(
            tx.delete(squad).where(eq(squad.squadGroupId, groupIdNumber))
          );

          for (const squadSnapshot of snapshot.squads) {
            const insertSquad = tx
              .insert(squad)
              .values({
                name: squadNameToString(squadSnapshot.name),
                position: squadSnapshot.position,
                squadGroupId: groupIdNumber,
                updatedAt: now,
              })
              .returning({ id: squad.id });
            const insertedSquadRows =
              yield* persistenceQueryUnsafe(insertSquad);

            const [insertedSquad] = insertedSquadRows;

            if (insertedSquad === undefined) {
              return new EffectSquadBuilderPersistenceUnavailable({
                cause: new Error("Failed to insert squad"),
                operation,
                provider: "postgres",
              });
            }

            if (squadSnapshot.characters.length === 0) {
              continue;
            }

            const placementRows = [];

            for (const placement of squadSnapshot.characters) {
              const character = availableByCharacterId.get(
                placement.characterId
              );

              if (character === undefined) {
                return new EffectSquadBuilderPersistenceUnavailable({
                  cause: new Error("Validated character was not available"),
                  operation,
                  provider: "postgres",
                });
              }

              placementRows.push({
                accountId: margonemAccountIdToNumber(character.accountId),
                characterId: placement.characterId,
                position: placement.position,
                squadGroupId: groupIdNumber,
                squadId: insertedSquad.id,
              });
            }

            yield* persistenceQueryUnsafe(
              tx.insert(squadCharacter).values(placementRows)
            );
          }

          return { _tag: "Saved" as const };
        })
      );

      const saved = yield* persistenceQuery(operation, transaction);

      if (saved._tag !== "Saved") {
        return yield* saved;
      }

      return yield* getSquadGroupDetailWithDatabase(database)({
        actorUserId,
        groupId: snapshot.groupId,
      }).pipe(
        Effect.catch(
          (
            error
          ): Effect.Effect<
            never,
            | SquadGroupNotFound
            | ActorDoesNotOwnSquadGroup
            | EffectSquadBuilderPersistenceUnavailable
          > => {
            if (error._tag === "ActorCannotViewSquadGroup") {
              return new ActorDoesNotOwnSquadGroup();
            }

            return Effect.fail(error);
          }
        )
      );
    });

const listGlobalSquadGroupsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    filters,
    limit,
  }: ListGlobalSquadGroupsInput): Effect.Effect<
    readonly GlobalSquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* listGlobalSquadGroupsEffect() {
      const operation = "listGlobalSquadGroups" as const;
      const filterPredicates = buildSquadGroupListFilterPredicates(
        database,
        filters
      );
      const select = database
        .select({
          characterCount: sql<number>`count(distinct ${squadCharacter.id})::int`,
          groupId: squadGroup.id,
          name: squadGroup.name,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          squadCount: sql<number>`count(distinct ${squad.id})::int`,
          updatedAt: squadGroup.updatedAt,
        })
        .from(squadGroup)
        .innerJoin(user, eq(user.id, squadGroup.ownerUserId))
        .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
        .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
        .where(and(eq(squadGroup.visibility, "global"), ...filterPredicates))
        .groupBy(squadGroup.id, user.id)
        .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id))
        .limit(limit);
      const rows = yield* persistenceQuery(operation, select);

      const groups: GlobalSquadGroupSummary[] = [];

      for (const row of rows) {
        const groupId = parseSquadGroupId(row.groupId);

        if (isError(groupId)) {
          return yield* failPersistence(operation, groupId.error);
        }

        const name = parseSquadGroupName(row.name);

        if (isError(name)) {
          return yield* failPersistence(operation, name.error);
        }

        const ownerUserId = yield* parsePersistedAppUserId(
          operation,
          row.ownerId
        );

        groups.push({
          characterCount: row.characterCount ?? 0,
          groupId: groupId.value,
          name: name.value,
          ownerUserId,
          ownerUserImage: row.ownerImage,
          ownerUserName: row.ownerName,
          squadCount: row.squadCount ?? 0,
          updatedAt: row.updatedAt,
        });
      }

      return groups;
    });

const setSquadGroupVisibilityWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    groupId,
    now,
    visibility,
  }: SetSquadGroupVisibilityStoreInput): Effect.Effect<
    SquadGroupVisibilityChange,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* setSquadGroupVisibilityEffect() {
      const operation = "setSquadGroupVisibility" as const;
      const groupIdNumber = squadGroupIdToNumber(groupId);
      const select = database
        .select({
          ownerUserId: squadGroup.ownerUserId,
          updatedAt: squadGroup.updatedAt,
          visibility: squadGroup.visibility,
        })
        .from(squadGroup)
        .where(eq(squadGroup.id, groupIdNumber))
        .limit(1);
      const rows = yield* persistenceQuery(operation, select);

      const [existing] = rows;

      if (existing === undefined) {
        return yield* new SquadGroupNotFound();
      }

      if (existing.ownerUserId !== appUserIdToString(actorUserId)) {
        return yield* new ActorDoesNotOwnSquadGroup();
      }

      if (existing.visibility === visibility) {
        return { groupId, updatedAt: existing.updatedAt, visibility };
      }

      const update = database
        .update(squadGroup)
        .set({ updatedAt: now, visibility })
        .where(eq(squadGroup.id, groupIdNumber))
        .returning({ updatedAt: squadGroup.updatedAt });
      const updatedRows = yield* persistenceQuery(operation, update);

      const [updated] = updatedRows;

      if (updated === undefined) {
        return yield* failPersistence(
          operation,
          new Error("Failed to update squad group visibility")
        );
      }

      return { groupId, updatedAt: updated.updatedAt, visibility };
    });

export const DrizzleEffectSquadGroupStoreLayer: Layer.Layer<
  EffectSquadGroupStore,
  never,
  EffectDatabase
> = Layer.effect(
  EffectSquadGroupStore,
  EffectDatabase.useSync((database) =>
    EffectSquadGroupStore.of({
      authorizeSquadGroupOwner: authorizeSquadGroupOwnerWithDatabase(database),
      createSquadGroup: createSquadGroupWithDatabase(database),
      findVerifiedSquadEditorInviteTarget:
        findVerifiedSquadEditorInviteTargetWithDatabase(database),
      getPendingSquadGroupInviteCount:
        getPendingSquadGroupInviteCountWithDatabase(database),
      getSquadGroupDetail: getSquadGroupDetailWithDatabase(database),
      listAvailableCharactersForOwner:
        listAvailableCharactersForOwnerWithDatabase(database),
      listGlobalSquadGroups: listGlobalSquadGroupsWithDatabase(database),
      listIncomingSquadGroupInvites:
        listIncomingSquadGroupInvitesWithDatabase(database),
      listMySquadGroups: listMySquadGroupsWithDatabase(database),
      listSharedSquadGroups: listSharedSquadGroupsWithDatabase(database),
      listSquadGroupEditorGrants:
        listSquadGroupEditorGrantsWithDatabase(database),
      respondToSquadGroupInvite:
        respondToSquadGroupInviteWithDatabase(database),
      revokeSquadGroupEditor: revokeSquadGroupEditorWithDatabase(database),
      saveSharedSquadGroupCharacters:
        saveSharedSquadGroupCharactersWithDatabase(database),
      saveSquadGroupSnapshot: saveSquadGroupSnapshotWithDatabase(database),
      searchSquadEditorInviteTargets:
        searchSquadEditorInviteTargetsWithDatabase(database),
      setSquadGroupVisibility: setSquadGroupVisibilityWithDatabase(database),
      upsertSquadGroupEditorInvite:
        upsertSquadGroupEditorInviteWithDatabase(database),
    })
  )
);

export const DrizzleEffectAccountImportStoreLayer: Layer.Layer<
  EffectAccountImportStore,
  never,
  EffectDatabase
> = Layer.effect(
  EffectAccountImportStore,
  EffectDatabase.useSync((database) =>
    EffectAccountImportStore.of({
      createOwnedAccountFromPendingImport:
        createOwnedAccountFromPendingImportWithDatabase(database),
      createPendingImport: createPendingImportWithDatabase(database),
      findPendingImportForConfirmation:
        findPendingImportForConfirmationWithDatabase(database),
      findProfileAccessState: findProfileAccessStateWithDatabase(database),
      listOwnedAccounts: listOwnedAccountsWithDatabase(database),
      markRequestFailed: markRequestFailedWithDatabase(database),
      markRequestSucceeded: markRequestSucceededWithDatabase(database),
      reserveRequest: reserveRequestWithDatabase(database),
    })
  )
);

export const DrizzleEffectAccountRefetchStoreLayer: Layer.Layer<
  EffectAccountRefetchStore,
  never,
  EffectDatabase
> = Layer.effect(
  EffectAccountRefetchStore,
  EffectDatabase.useSync((database) =>
    EffectAccountRefetchStore.of({
      applyRefetchedAccount: applyRefetchedAccountWithDatabase(database),
      createPendingRefetch: createPendingRefetchWithDatabase(database),
      findPendingRefetchForApply:
        findPendingRefetchForApplyWithDatabase(database),
      getAccountForRefetch: getAccountForRefetchWithDatabase(database),
      markPendingRefetchApplied:
        markPendingRefetchAppliedWithDatabase(database),
      markRequestFailed: markRequestFailedWithDatabase(database),
      markRequestSucceeded: markRequestSucceededWithDatabase(database),
      reserveRequest: reserveRequestWithDatabase(database),
    })
  )
);

export const DrizzleEffectAccountSharingStoreLayer: Layer.Layer<
  EffectAccountSharingStore,
  never,
  EffectDatabase
> = Layer.effect(
  EffectAccountSharingStore,
  EffectDatabase.useSync((database) =>
    EffectAccountSharingStore.of({
      findOwnedAccountForSharing:
        findOwnedAccountForSharingWithDatabase(database),
      findVerifiedInviteTarget: findVerifiedInviteTargetWithDatabase(database),
      listAccountAccessGrants: listAccountAccessGrantsWithDatabase(database),
      listIncomingAccountInvites:
        listIncomingAccountInvitesWithDatabase(database),
      listOwnedAccounts: listOwnedAccountsWithDatabase(database),
      listSharedAccounts: listSharedAccountsWithDatabase(database),
      respondToAccountAccessInvite:
        respondToAccountAccessInviteWithDatabase(database),
      revokeAccountAccess: revokeAccountAccessWithDatabase(database),
      searchInviteTargets: searchInviteTargetsWithDatabase(database),
      upsertAccountAccessInvite:
        upsertAccountAccessInviteWithDatabase(database),
    })
  )
);

export const DrizzleEffectSquadBuilderStoresLayer = Layer.mergeAll(
  DrizzleEffectAccountImportStoreLayer,
  DrizzleEffectAccountRefetchStoreLayer,
  DrizzleEffectAccountSharingStoreLayer,
  DrizzleEffectSquadGroupStoreLayer
);
