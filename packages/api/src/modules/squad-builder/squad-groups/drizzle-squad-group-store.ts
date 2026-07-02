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
} from "../account-access-status";
import type { AccountAccessStatus } from "../account-access-status";
import {
  accountDisplayNameToString,
  parseAccountDisplayName,
} from "../account-display-name";
import type { ApplyAccountRefetchOutput } from "../account-refetch/apply-account-refetch";
import { appUserIdToString, parseAppUserId } from "../app-user-id";
import type { AppUserId } from "../app-user-id";
import { firecrawlYearMonthToString } from "../firecrawl-year-month";
import {
  margonemAccountAccessIdToNumber,
  parseMargonemAccountAccessId,
} from "../margonem-account-access-id";
import type { MargonemAccountAccessId } from "../margonem-account-access-id";
import {
  margonemAccountIdToNumber,
  parseMargonemAccountId,
} from "../margonem-account-id";
import type { MargonemAccountId } from "../margonem-account-id";
import {
  parseMargonemProfession,
  parseMargonemWorld,
} from "../margonem-character";
import {
  parseMargonemCharacterId,
  parseMargonemProfileId,
  parsePositiveLevel,
  characterIdToNumber,
  levelToNumber,
  profileIdToNumber,
} from "../margonem-profile-id";
import { toMargonemProfileUrl } from "../margonem-profile-url";
import { pendingImportIdToNumber } from "../pending-margonem-account-import-id";
import {
  parsePendingMargonemAccountRefetchId,
  pendingRefetchIdToNumber,
} from "../pending-margonem-account-refetch-id";
import { isError } from "../result";
import type {
  SquadGroupAccess,
  SquadGroupOwnerAccess,
} from "../squad-group-access";
import { parseSquadGroupId, squadGroupIdToNumber } from "../squad-group-id";
import {
  parseSquadGroupInvitationId,
  squadGroupInvitationIdToNumber,
} from "../squad-group-invitation-id";
import type { SquadGroupInvitationId } from "../squad-group-invitation-id";
import {
  canTransitionSquadGroupInvitation,
  parseSquadGroupInvitationStatus,
} from "../squad-group-invitation-status";
import type { SquadGroupInvitationStatus } from "../squad-group-invitation-status";
import {
  squadGroupLevelBoundToNumber,
  squadGroupNameQueryToString,
} from "../squad-group-list-filters";
import { parseSquadGroupVisibility } from "../squad-group-visibility";
import { parseSquadId } from "../squad-id";
import type { SquadId } from "../squad-id";
import {
  parseSquadGroupName,
  squadGroupNameToString,
  squadNameToString,
} from "../squad-name";
import { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";
import type {
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
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
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  PendingMargonemAccountRefetchNotFound,
  ProfileAccessState,
  RefetchableMargonemAccount,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  SaveSharedSquadGroupCharactersStoreInput,
  SaveSquadGroupSnapshotStoreInput,
  SearchInviteTargetsStoreInput,
  RespondToAccountAccessInviteStoreInput,
  RevokeAccountAccessResult,
  RevokeAccountAccessStoreInput,
  SetSquadGroupVisibilityStoreInput,
  SharedMargonemAccountSummary,
  SearchSquadEditorInviteTargetsStoreInput,
  SquadEditorInviteTarget,
  SquadGroupInvitationSummary,
  SquadGroupVisibilityChange,
  AccountInviteTarget,
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  UpsertSquadGroupEditorInviteInput,
  SquadGroupCharacter,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupSummary,
} from "./squad-group-store";
import { EffectSquadGroupStore } from "./squad-group-store";

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
  | "listGlobalSquadGroups"
  | "listIncomingAccountInvites"
  | "listSharedAccounts"
  | "listOwnedAccounts"
  | "listMySquadGroups"
  | "markRequestFailed"
  | "markRequestSucceeded"
  | "markPendingRefetchApplied"
  | "reserveRequest"
  | "respondToAccountAccessInvite"
  | "revokeAccountAccess"
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
      const accountSelectEffect = accountSelect as Effect.Effect<
        readonly { readonly id: number; readonly ownerUserId: string }[],
        unknown,
        never
      >;
      const accountRows = yield* accountSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
      const accessSelectEffect = accessSelect as Effect.Effect<
        readonly { readonly id: number }[],
        unknown,
        never
      >;
      const accessRows = yield* accessSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

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
          yield* tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${`firecrawl:${yearMonthText}`}))`
          ) as Effect.Effect<unknown, unknown, never>;
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
          const usageRows = yield* usageSelect as Effect.Effect<
            readonly { readonly usedRequests: number }[],
            unknown,
            never
          >;
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
          const insertedRows = yield* insert as Effect.Effect<
            readonly { readonly id: number }[],
            unknown,
            never
          >;
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

      return yield* (
        transaction as Effect.Effect<ReservedFirecrawlRequest, unknown, never>
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));
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

    const updateEffect = update as Effect.Effect<unknown, unknown, never>;
    const catchEffect = Effect["catch"];
    const handlePersistenceFailure = function handlePersistenceFailure(
      error: unknown
    ) {
      return failPersistence(operation, error);
    };
    const catchPersistenceFailure = catchEffect(handlePersistenceFailure);

    return updateEffect.pipe(catchPersistenceFailure, Effect.asVoid);
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

    const updateEffect = update as Effect.Effect<unknown, unknown, never>;
    const catchEffect = Effect["catch"];
    const handlePersistenceFailure = function handlePersistenceFailure(
      error: unknown
    ) {
      return failPersistence(operation, error);
    };
    const catchPersistenceFailure = catchEffect(handlePersistenceFailure);

    return updateEffect.pipe(catchPersistenceFailure, Effect.asVoid);
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
          const insertedRows = yield* insert as Effect.Effect<
            readonly { readonly id: number }[],
            unknown,
            never
          >;
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
            yield* characterInsert as Effect.Effect<unknown, unknown, never>;
          }

          return {
            id: preview.id as PendingMargonemAccountImport["id"],
            profileId,
          };
        })
      );

      return yield* (
        transaction as Effect.Effect<
          PendingMargonemAccountImport,
          unknown,
          never
        >
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));
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
      const previewSelectEffect = previewSelect as Effect.Effect<
        readonly {
          readonly fetchedAt: Date;
          readonly id: number;
          readonly profileId: number;
        }[],
        unknown,
        never
      >;
      const previewRows = yield* previewSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [preview] = previewRows;

      if (preview === undefined) {
        return yield* Effect.fail({
          _tag: "PendingMargonemAccountImportNotFound" as const,
        });
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
      const characterSelectEffect = characterSelect as Effect.Effect<
        readonly {
          readonly avatarUrl: string | null;
          readonly characterId: number;
          readonly level: number;
          readonly name: string;
          readonly profession: string;
          readonly world: string;
        }[],
        unknown,
        never
      >;
      const characterRows = yield* characterSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
          const existingRows = yield* existingSelect as Effect.Effect<
            readonly { readonly ownerUserId: string }[],
            unknown,
            never
          >;
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
          const accountRows = yield* insert as Effect.Effect<
            readonly { readonly createdAt: Date; readonly id: number }[],
            unknown,
            never
          >;
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
            yield* characterInsert as Effect.Effect<unknown, unknown, never>;
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
          yield* update as Effect.Effect<unknown, unknown, never>;

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

      const result = yield* (
        transaction as Effect.Effect<
          OwnedMargonemAccountSummary | DuplicateMargonemAccountError,
          unknown,
          never
        >
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

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
      // SAFETY: Drizzle's Effect PostgreSQL insert builder is an Effect whose
      // runtime value is the returned row array. The cast narrows the generated
      // query effect so this adapter can translate its typed query failure into
      // the local persistence error below.
      const insertEffect = insert as Effect.Effect<
        readonly { readonly id: number; readonly updatedAt: Date }[],
        unknown,
        never
      >;
      const createdRows = yield* insertEffect.pipe(
        Effect.catch((error) => failPersistence("createSquadGroup", error))
      );

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
      // SAFETY: Drizzle's Effect PostgreSQL select builder is an Effect whose
      // runtime value is the selected row array. The cast narrows the generated
      // query effect so this adapter can translate its typed query failure into
      // the local persistence error below.
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly characterCount: number | null;
          readonly groupId: number;
          readonly name: string;
          readonly squadCount: number | null;
          readonly updatedAt: Date;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence("listMySquadGroups", error))
      );

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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly accountId: number;
          readonly characterCount: number | null;
          readonly createdAt: Date;
          readonly displayName: string;
          readonly lastFetchedAt: Date | null;
          readonly profileId: number;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
    | { readonly _tag: "MargonemAccountNotFound" }
    | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
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
      const accountSelectEffect = accountSelect as Effect.Effect<
        readonly {
          readonly displayName: string;
          readonly ownerUserId: string;
          readonly profileId: number;
        }[],
        unknown,
        never
      >;
      const accountRows = yield* accountSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [account] = accountRows;

      if (account === undefined) {
        return yield* Effect.fail({ _tag: "MargonemAccountNotFound" as const });
      }

      if (account.ownerUserId !== appUserIdToString(actorUserId)) {
        return yield* Effect.fail({
          _tag: "ActorDoesNotOwnMargonemAccount" as const,
        });
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
      const characterSelectEffect = characterSelect as Effect.Effect<
        readonly {
          readonly affectedSquadCount: number | null;
          readonly avatarUrl: string | null;
          readonly characterId: number;
          readonly id: number;
          readonly level: number;
          readonly name: string;
          readonly profession: string;
          readonly world: string;
        }[],
        unknown,
        never
      >;
      const characterRows = yield* characterSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
          const insertedRows = yield* insert as Effect.Effect<
            readonly { readonly id: number }[],
            unknown,
            never
          >;
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
            yield* characterInsert as Effect.Effect<unknown, unknown, never>;
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

      return yield* (
        transaction as Effect.Effect<
          PendingMargonemAccountRefetch,
          unknown,
          never
        >
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));
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
      const previewSelectEffect = previewSelect as Effect.Effect<
        readonly {
          readonly accountId: number;
          readonly actorUserId: string;
          readonly fetchedAt: Date;
          readonly id: number;
          readonly profileId: number;
        }[],
        unknown,
        never
      >;
      const previewRows = yield* previewSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [preview] = previewRows;

      if (preview === undefined) {
        return yield* Effect.fail({
          _tag: "PendingMargonemAccountRefetchNotFound" as const,
        });
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
      const characterSelectEffect = characterSelect as Effect.Effect<
        readonly {
          readonly avatarUrl: string | null;
          readonly characterId: number;
          readonly level: number;
          readonly name: string;
          readonly profession: string;
          readonly world: string;
        }[],
        unknown,
        never
      >;
      const characterRows = yield* characterSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
    const updateEffect = update as Effect.Effect<unknown, unknown, never>;
    const catchEffect = Effect["catch"];
    const handlePersistenceFailure = function handlePersistenceFailure(
      error: unknown
    ) {
      return failPersistence(operation, error);
    };
    const catchPersistenceFailure = catchEffect(handlePersistenceFailure);

    return updateEffect.pipe(catchPersistenceFailure, Effect.asVoid);
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

          yield* tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${`margonem-refetch:${accountIdNumber}`}))`
          ) as Effect.Effect<unknown, unknown, never>;

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
          const accountRows = yield* accountSelect as Effect.Effect<
            readonly { readonly id: number }[],
            unknown,
            never
          >;

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
          const currentRows = yield* currentSelect as Effect.Effect<
            readonly {
              readonly avatarUrl: string | null;
              readonly characterId: number;
              readonly id: number;
              readonly level: number;
              readonly name: string;
              readonly profession: string;
            }[],
            unknown,
            never
          >;
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
            yield* tx
              .insert(margonemCharacter)
              .values(charactersToInsert) as Effect.Effect<
              unknown,
              unknown,
              never
            >;
          }

          for (const character of charactersToUpdate) {
            yield* tx
              .update(margonemCharacter)
              .set({
                avatarUrl: character.avatarUrl,
                level: character.level,
                name: character.name,
                profession: character.profession,
                updatedAt: now,
                world: character.world,
              })
              .where(
                eq(margonemCharacter.id, character.databaseCharacterId)
              ) as Effect.Effect<unknown, unknown, never>;
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
            const affectedGroups = yield* affectedGroupSelect as Effect.Effect<
              readonly { readonly groupId: number }[],
              unknown,
              never
            >;
            const affectedGroupIds = [
              ...new Set(affectedGroups.map((group) => group.groupId)),
            ];
            const removedPlacementsDelete = tx
              .delete(squadCharacter)
              .where(
                inArray(squadCharacter.characterId, removedDatabaseCharacterIds)
              )
              .returning({ id: squadCharacter.id });
            const removedPlacements =
              yield* removedPlacementsDelete as Effect.Effect<
                readonly { readonly id: number }[],
                unknown,
                never
              >;
            removedSquadCharacterCount = removedPlacements.length;

            if (affectedGroupIds.length > 0) {
              yield* tx
                .update(squadGroup)
                .set({ updatedAt: now })
                .where(
                  inArray(squadGroup.id, affectedGroupIds)
                ) as Effect.Effect<unknown, unknown, never>;
            }

            yield* tx
              .delete(margonemCharacter)
              .where(
                inArray(margonemCharacter.id, removedDatabaseCharacterIds)
              ) as Effect.Effect<unknown, unknown, never>;
          }

          yield* tx
            .update(margonemAccount)
            .set({ lastFetchedAt: pendingRefetch.fetchedAt, updatedAt: now })
            .where(eq(margonemAccount.id, accountIdNumber)) as Effect.Effect<
            unknown,
            unknown,
            never
          >;

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

      return yield* (
        transaction as Effect.Effect<ApplyAccountRefetchOutput, unknown, never>
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly image: string | null;
          readonly name: string;
          readonly userId: string;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
    readonly groupId: SquadGroupSummary["groupId"];
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
      const selectEffect = select as Effect.Effect<
        readonly { readonly ownerUserId: string }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [group] = rows;

      if (group === undefined) {
        return yield* Effect.fail({ _tag: "SquadGroupNotFound" as const });
      }

      if (group.ownerUserId !== appUserIdToString(actorUserId)) {
        return yield* Effect.fail({
          _tag: "ActorDoesNotOwnSquadGroup" as const,
        });
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly image: string | null;
          readonly name: string;
          readonly userId: string;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
    | { readonly _tag: "SquadEditorInviteTargetNotFound" }
    | { readonly _tag: "SquadEditorInviteTargetNotVerified" }
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly image: string | null;
          readonly name: string;
          readonly userId: string;
          readonly verified: boolean;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [target] = rows;

      if (target === undefined) {
        return yield* Effect.fail({
          _tag: "SquadEditorInviteTargetNotFound" as const,
        });
      }

      if (!target.verified) {
        return yield* Effect.fail({
          _tag: "SquadEditorInviteTargetNotVerified" as const,
        });
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
    | { readonly _tag: "SquadGroupInvitationNotFound" }
    | EffectSquadBuilderPersistenceUnavailable,
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly createdAt: Date;
          readonly invitationId: number;
          readonly ownerId: string;
          readonly ownerImage: string | null;
          readonly ownerName: string;
          readonly squadGroupId: number;
          readonly squadGroupName: string;
          readonly status: string;
          readonly updatedAt: Date;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [row] = rows;

      if (row === undefined) {
        return yield* Effect.fail({
          _tag: "SquadGroupInvitationNotFound" as const,
        });
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
    | {
        readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
        readonly currentStatus: SquadGroupInvitationStatus;
        readonly attempted: string;
      }
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
          const existingRows = yield* existingSelect as Effect.Effect<
            readonly { readonly id: number; readonly status: string }[],
            unknown,
            never
          >;
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
            const insertedRows = yield* insert as Effect.Effect<
              readonly { readonly id: number }[],
              unknown,
              never
            >;
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
            return {
              _tag: "SquadGroupInvitationTransitionNotAllowed" as const,
              attempted: "pending",
              currentStatus: status.value,
            };
          }

          const update = tx
            .update(squadGroupInvitation)
            .set({ invitedByUserId: owner, status: "pending", updatedAt: now })
            .where(eq(squadGroupInvitation.id, existing.id))
            .returning({ id: squadGroupInvitation.id });
          const updatedRows = yield* update as Effect.Effect<
            readonly { readonly id: number }[],
            unknown,
            never
          >;
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
      const upserted = yield* (
        transaction as Effect.Effect<
          | number
          | {
              readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
              readonly currentStatus: SquadGroupInvitationStatus;
              readonly attempted: string;
            },
          unknown,
          never
        >
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      if (typeof upserted !== "number") {
        return yield* Effect.fail(upserted);
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

const findOwnedAccountForSharingWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
  }: FindOwnedAccountForSharingInput): Effect.Effect<
    OwnedAccountForSharing,
    | { readonly _tag: "MargonemAccountNotFound" }
    | EffectSquadBuilderPersistenceUnavailable,
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly displayName: string;
          readonly ownerUserId: string;
          readonly profileId: number;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [account] = rows;

      if (account === undefined) {
        return yield* Effect.fail({ _tag: "MargonemAccountNotFound" as const });
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
    | { readonly _tag: "AccountAccessInviteNotFound" }
    | EffectSquadBuilderPersistenceUnavailable,
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly accountDisplayName: string;
          readonly accountId: number;
          readonly createdAt: Date;
          readonly invitedUserId: string;
          readonly ownerId: string;
          readonly ownerImage: string | null;
          readonly ownerName: string;
          readonly profileId: number;
          readonly status: string;
          readonly updatedAt: Date;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [row] = rows;

      if (row === undefined) {
        return yield* Effect.fail({
          _tag: "AccountAccessInviteNotFound" as const,
        });
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
    | { readonly _tag: "InviteTargetNotFound" }
    | { readonly _tag: "InviteTargetNotVerified" }
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly image: string | null;
          readonly name: string;
          readonly userId: string;
          readonly verified: boolean;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [target] = rows;

      if (target === undefined) {
        return yield* Effect.fail({ _tag: "InviteTargetNotFound" as const });
      }

      if (!target.verified) {
        return yield* Effect.fail({
          _tag: "InviteTargetNotVerified" as const,
        });
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
    | {
        readonly _tag: "AccountAccessTransitionNotAllowed";
        readonly currentStatus: AccountAccessStatus;
        readonly attempted: string;
      }
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
          const existingRows = yield* existingSelect as Effect.Effect<
            readonly { readonly id: number; readonly status: string }[],
            unknown,
            never
          >;
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
            const insertedRows = yield* insert as Effect.Effect<
              readonly { readonly id: number }[],
              unknown,
              never
            >;
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
            return {
              _tag: "AccountAccessTransitionNotAllowed" as const,
              attempted: "pending",
              currentStatus: status.value,
            };
          }

          const update = tx
            .update(margonemAccountAccess)
            .set({ invitedByUserId: owner, status: "pending", updatedAt: now })
            .where(eq(margonemAccountAccess.id, existing.id))
            .returning({ id: margonemAccountAccess.id });
          const updatedRows = yield* update as Effect.Effect<
            readonly { readonly id: number }[],
            unknown,
            never
          >;
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
      const upserted = yield* (
        transaction as Effect.Effect<
          | number
          | {
              readonly _tag: "AccountAccessTransitionNotAllowed";
              readonly currentStatus: AccountAccessStatus;
              readonly attempted: string;
            },
          unknown,
          never
        >
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      if (typeof upserted !== "number") {
        return yield* Effect.fail(upserted);
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
      const selectEffect = select as Effect.Effect<
        readonly { readonly id: number }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly accountId: number;
          readonly characterCount: number | null;
          readonly createdAt: Date;
          readonly displayName: string;
          readonly lastFetchedAt: Date | null;
          readonly ownerId: string;
          readonly ownerImage: string | null;
          readonly ownerName: string;
          readonly profileId: number;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly accessId: number;
          readonly createdAt: Date;
          readonly image: string | null;
          readonly name: string;
          readonly status: string;
          readonly updatedAt: Date;
          readonly userId: string;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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

const respondToAccountAccessInviteWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accessId,
    invitedUserId,
    now,
    response,
  }: RespondToAccountAccessInviteStoreInput): Effect.Effect<
    AccountAccessInviteSummary,
    | { readonly _tag: "AccountAccessInviteNotFound" }
    | { readonly _tag: "ActorIsNotInviteRecipient" }
    | {
        readonly _tag: "AccountAccessTransitionNotAllowed";
        readonly currentStatus: AccountAccessStatus;
        readonly attempted: string;
      }
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
          const existingRows = yield* existingSelect as Effect.Effect<
            readonly {
              readonly id: number;
              readonly status: string;
              readonly userId: string;
            }[],
            unknown,
            never
          >;
          const [existing] = existingRows;

          if (existing === undefined) {
            return {
              _tag: "AccountAccessInviteNotFound" as const,
            };
          }

          if (existing.userId !== invitedUser) {
            return {
              _tag: "ActorIsNotInviteRecipient" as const,
            };
          }

          const status = parseAccountAccessStatus(existing.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          const nextStatus: AccountAccessStatus =
            response === "accept" ? "accepted" : "declined";

          if (!canTransitionAccountAccess(status.value, nextStatus)) {
            return {
              _tag: "AccountAccessTransitionNotAllowed" as const,
              attempted: nextStatus,
              currentStatus: status.value,
            };
          }

          const update = tx
            .update(margonemAccountAccess)
            .set({ status: nextStatus, updatedAt: now })
            .where(eq(margonemAccountAccess.id, existing.id))
            .returning({ id: margonemAccountAccess.id });
          const updatedRows = yield* update as Effect.Effect<
            readonly { readonly id: number }[],
            unknown,
            never
          >;
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
      const respond = yield* (
        transaction as Effect.Effect<
          | { readonly _tag: "Updated" }
          | { readonly _tag: "AccountAccessInviteNotFound" }
          | { readonly _tag: "ActorIsNotInviteRecipient" }
          | {
              readonly _tag: "AccountAccessTransitionNotAllowed";
              readonly currentStatus: AccountAccessStatus;
              readonly attempted: string;
            },
          unknown,
          never
        >
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      if (respond._tag !== "Updated") {
        return yield* Effect.fail(respond);
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
    | { readonly _tag: "AccountAccessInviteNotFound" }
    | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
    | {
        readonly _tag: "AccountAccessTransitionNotAllowed";
        readonly currentStatus: AccountAccessStatus;
        readonly attempted: string;
      }
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
          const accessRows = yield* accessSelect as Effect.Effect<
            readonly {
              readonly accountId: number;
              readonly status: string;
              readonly userId: string;
            }[],
            unknown,
            never
          >;
          const [access] = accessRows;

          if (access === undefined) {
            return { _tag: "AccountAccessInviteNotFound" as const };
          }

          const accountSelect = tx
            .select({ ownerUserId: margonemAccount.ownerUserId })
            .from(margonemAccount)
            .where(eq(margonemAccount.id, access.accountId))
            .limit(1);
          const accountRows = yield* accountSelect as Effect.Effect<
            readonly { readonly ownerUserId: string }[],
            unknown,
            never
          >;
          const [account] = accountRows;

          if (account === undefined) {
            return { _tag: "AccountAccessInviteNotFound" as const };
          }

          if (account.ownerUserId !== owner) {
            return { _tag: "ActorDoesNotOwnMargonemAccount" as const };
          }

          const status = parseAccountAccessStatus(access.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          if (!canTransitionAccountAccess(status.value, "revoked")) {
            return {
              _tag: "AccountAccessTransitionNotAllowed" as const,
              attempted: "revoked",
              currentStatus: status.value,
            };
          }

          yield* tx
            .update(margonemAccountAccess)
            .set({ status: "revoked", updatedAt: now })
            .where(
              eq(margonemAccountAccess.id, accessIdNumber)
            ) as Effect.Effect<unknown, unknown, never>;

          let removedSquadCharacterCount = 0;

          if (status.value === "accepted") {
            const characterSelect = tx
              .select({ id: margonemCharacter.id })
              .from(margonemCharacter)
              .where(eq(margonemCharacter.accountId, access.accountId));
            const accountCharacters = yield* characterSelect as Effect.Effect<
              readonly { readonly id: number }[],
              unknown,
              never
            >;
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
                yield* affectedGroupSelect as Effect.Effect<
                  readonly { readonly groupId: number }[],
                  unknown,
                  never
                >;
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
                const removedPlacements =
                  yield* removedPlacementsDelete as Effect.Effect<
                    readonly { readonly id: number }[],
                    unknown,
                    never
                  >;
                removedSquadCharacterCount = removedPlacements.length;

                yield* tx
                  .update(squadGroup)
                  .set({ updatedAt: now })
                  .where(
                    inArray(squadGroup.id, affectedGroupIds)
                  ) as Effect.Effect<unknown, unknown, never>;
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
      const revoked = yield* (
        transaction as Effect.Effect<
          | {
              readonly _tag: "Revoked";
              readonly accountId: number;
              readonly removedSquadCharacterCount: number;
              readonly revokedUserId: string;
            }
          | { readonly _tag: "AccountAccessInviteNotFound" }
          | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
          | {
              readonly _tag: "AccountAccessTransitionNotAllowed";
              readonly currentStatus: AccountAccessStatus;
              readonly attempted: string;
            },
          unknown,
          never
        >
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      if (revoked._tag !== "Revoked") {
        return yield* Effect.fail(revoked);
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
    EffectSquadBuilderPersistenceUnavailable,
    never
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly accountDisplayName: string;
          readonly accountId: number;
          readonly accountOwnerUserId: string;
          readonly accountOwnerUserImage: string | null;
          readonly accountOwnerUserName: string;
          readonly avatarUrl: string | null;
          readonly characterId: number;
          readonly level: number;
          readonly margonemCharacterId: number;
          readonly name: string;
          readonly profession: string;
          readonly world: string;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
    | EffectSquadBuilderPersistenceUnavailable,
    never
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
      const groupSelectEffect = groupSelect as Effect.Effect<
        readonly {
          readonly name: string;
          readonly ownerUserId: string;
          readonly updatedAt: Date;
          readonly visibility: string;
        }[],
        unknown,
        never
      >;
      const groupRows = yield* groupSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [group] = groupRows;

      if (group === undefined) {
        return yield* Effect.fail({ _tag: "SquadGroupNotFound" as const });
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
        const inviteSelectEffect = inviteSelect as Effect.Effect<
          readonly { readonly id: number }[],
          unknown,
          never
        >;
        const inviteRows = yield* inviteSelectEffect.pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );
        const [invite] = inviteRows;

        if (invite === undefined) {
          if (visibility.value !== "global") {
            return yield* Effect.fail({
              _tag: "ActorCannotViewSquadGroup" as const,
            });
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
      const squadSelectEffect = squadSelect as Effect.Effect<
        readonly {
          readonly id: number;
          readonly name: string;
          readonly position: number;
        }[],
        unknown,
        never
      >;
      const squadRows = yield* squadSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

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
      const placementSelectEffect = placementSelect as Effect.Effect<
        readonly {
          readonly accountDisplayName: string;
          readonly accountId: number;
          readonly accountOwnerUserImage: string | null;
          readonly accountOwnerUserName: string;
          readonly avatarUrl: string | null;
          readonly characterId: number;
          readonly level: number;
          readonly margonemCharacterId: number;
          readonly name: string;
          readonly placementId: number;
          readonly position: number;
          readonly profession: string;
          readonly squadId: number;
        }[],
        unknown,
        never
      >;
      const placementRows = yield* placementSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
    | { readonly _tag: "SquadNotInGroup"; readonly squadId: SquadId }
    | { readonly _tag: "EditorCannotChangeSquadStructure" }
    | {
        readonly _tag: "SquadCharacterNotAccessible";
        readonly characterId: number;
      }
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* saveSharedSquadGroupCharactersEffect() {
      const operation = "saveSharedSquadGroupCharacters" as const;
      const groupIdNumber = squadGroupIdToNumber(groupId);
      const actor = appUserIdToString(actorUserId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* saveSharedSquadGroupCharactersTransaction() {
          yield* tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNumber}`}))`
          ) as Effect.Effect<unknown, unknown, never>;

          const groupSelect = tx
            .select({ ownerUserId: squadGroup.ownerUserId })
            .from(squadGroup)
            .where(eq(squadGroup.id, groupIdNumber))
            .limit(1);
          const groupRows = yield* groupSelect as Effect.Effect<
            readonly { readonly ownerUserId: string }[],
            unknown,
            never
          >;
          const [group] = groupRows;

          if (group === undefined) {
            return { _tag: "SquadGroupNotFound" as const };
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
            const inviteRows = yield* inviteSelect as Effect.Effect<
              readonly { readonly id: number }[],
              unknown,
              never
            >;

            if (inviteRows[0] === undefined) {
              return { _tag: "ActorCannotEditSquadGroup" as const };
            }
          }

          const existingSquadSelect = tx
            .select({ id: squad.id })
            .from(squad)
            .where(eq(squad.squadGroupId, groupIdNumber));
          const existingSquads = yield* existingSquadSelect as Effect.Effect<
            readonly { readonly id: number }[],
            unknown,
            never
          >;
          const existingSquadIds = new Set(existingSquads.map((row) => row.id));

          if (existingSquadIds.size !== snapshot.squads.length) {
            return { _tag: "EditorCannotChangeSquadStructure" as const };
          }

          for (const submitted of snapshot.squads) {
            if (!existingSquadIds.has(submitted.squadId)) {
              return {
                _tag: "SquadNotInGroup" as const,
                squadId: submitted.squadId,
              };
            }
          }

          yield* tx
            .delete(squadCharacter)
            .where(
              eq(squadCharacter.squadGroupId, groupIdNumber)
            ) as Effect.Effect<unknown, unknown, never>;

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
            const characterRows = yield* characterSelect as Effect.Effect<
              readonly { readonly accountId: number; readonly id: number }[],
              unknown,
              never
            >;

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
                return {
                  _tag: "SquadCharacterNotAccessible" as const,
                  characterId: character.characterId,
                };
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
            yield* tx
              .insert(squadCharacter)
              .values(placements) as Effect.Effect<unknown, unknown, never>;
          }

          yield* tx
            .update(squadGroup)
            .set({ updatedAt: now })
            .where(eq(squadGroup.id, groupIdNumber)) as Effect.Effect<
            unknown,
            unknown,
            never
          >;

          return { _tag: "Saved" as const };
        })
      );

      const saved = yield* (
        transaction as Effect.Effect<
          | { readonly _tag: "Saved" }
          | SquadGroupNotFound
          | ActorCannotEditSquadGroup
          | { readonly _tag: "SquadNotInGroup"; readonly squadId: SquadId }
          | { readonly _tag: "EditorCannotChangeSquadStructure" }
          | {
              readonly _tag: "SquadCharacterNotAccessible";
              readonly characterId: number;
            },
          unknown,
          never
        >
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      if (saved._tag !== "Saved") {
        return yield* Effect.fail(saved);
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
            | EffectSquadBuilderPersistenceUnavailable,
            never
          > => {
            if (error._tag === "ActorCannotViewSquadGroup") {
              return Effect.fail({
                _tag: "ActorCannotEditSquadGroup" as const,
              });
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
    | EffectSquadBuilderPersistenceUnavailable,
    never
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
          yield* tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNumber}`}))`
          ) as Effect.Effect<unknown, unknown, never>;

          const groupSelect = tx
            .select({ ownerUserId: squadGroup.ownerUserId })
            .from(squadGroup)
            .where(eq(squadGroup.id, groupIdNumber))
            .limit(1);
          const groupRows = yield* groupSelect as Effect.Effect<
            readonly { readonly ownerUserId: string }[],
            unknown,
            never
          >;
          const [group] = groupRows;

          if (group === undefined) {
            return { _tag: "SquadGroupNotFound" as const };
          }

          if (group.ownerUserId !== appUserIdToString(actorUserId)) {
            return { _tag: "ActorDoesNotOwnSquadGroup" as const };
          }

          yield* tx
            .update(squadGroup)
            .set({
              name: squadGroupNameToString(snapshot.name),
              updatedAt: now,
            })
            .where(eq(squadGroup.id, groupIdNumber)) as Effect.Effect<
            unknown,
            unknown,
            never
          >;

          yield* tx
            .delete(squad)
            .where(eq(squad.squadGroupId, groupIdNumber)) as Effect.Effect<
            unknown,
            unknown,
            never
          >;

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
            const insertedSquadRows = yield* insertSquad as Effect.Effect<
              readonly { readonly id: number }[],
              unknown,
              never
            >;
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

            yield* tx
              .insert(squadCharacter)
              .values(placementRows) as Effect.Effect<unknown, unknown, never>;
          }

          return { _tag: "Saved" as const };
        })
      );

      const saved = yield* (
        transaction as Effect.Effect<
          | { readonly _tag: "Saved" }
          | SquadGroupNotFound
          | ActorDoesNotOwnSquadGroup
          | EffectSquadBuilderPersistenceUnavailable,
          unknown,
          never
        >
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      if (saved._tag !== "Saved") {
        return yield* Effect.fail(saved);
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
            | EffectSquadBuilderPersistenceUnavailable,
            never
          > => {
            if (error._tag === "ActorCannotViewSquadGroup") {
              return Effect.fail({
                _tag: "ActorDoesNotOwnSquadGroup" as const,
              });
            }

            return Effect.fail(error);
          }
        )
      );
    }) as Effect.Effect<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | EffectSquadBuilderPersistenceUnavailable,
      never
    >;

const listGlobalSquadGroupsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    filters,
    limit,
  }: ListGlobalSquadGroupsInput): Effect.Effect<
    readonly GlobalSquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly characterCount: number | null;
          readonly groupId: number;
          readonly name: string;
          readonly ownerId: string;
          readonly ownerImage: string | null;
          readonly ownerName: string;
          readonly squadCount: number | null;
          readonly updatedAt: Date;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
    | EffectSquadBuilderPersistenceUnavailable,
    never
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly ownerUserId: string;
          readonly updatedAt: Date;
          readonly visibility: string;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [existing] = rows;

      if (existing === undefined) {
        return yield* Effect.fail({ _tag: "SquadGroupNotFound" as const });
      }

      if (existing.ownerUserId !== appUserIdToString(actorUserId)) {
        return yield* Effect.fail({
          _tag: "ActorDoesNotOwnSquadGroup" as const,
        });
      }

      if (existing.visibility === visibility) {
        return { groupId, updatedAt: existing.updatedAt, visibility };
      }

      const update = database
        .update(squadGroup)
        .set({ updatedAt: now, visibility })
        .where(eq(squadGroup.id, groupIdNumber))
        .returning({ updatedAt: squadGroup.updatedAt });
      const updateEffect = update as Effect.Effect<
        readonly { readonly updatedAt: Date }[],
        unknown,
        never
      >;
      const updatedRows = yield* updateEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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
      applyRefetchedAccount: applyRefetchedAccountWithDatabase(database),
      authorizeSquadGroupOwner: authorizeSquadGroupOwnerWithDatabase(database),
      createOwnedAccountFromPendingImport:
        createOwnedAccountFromPendingImportWithDatabase(database),
      createPendingImport: createPendingImportWithDatabase(database),
      createPendingRefetch: createPendingRefetchWithDatabase(database),
      createSquadGroup: createSquadGroupWithDatabase(database),
      findOwnedAccountForSharing:
        findOwnedAccountForSharingWithDatabase(database),
      findPendingImportForConfirmation:
        findPendingImportForConfirmationWithDatabase(database),
      findPendingRefetchForApply:
        findPendingRefetchForApplyWithDatabase(database),
      findProfileAccessState: findProfileAccessStateWithDatabase(database),
      findVerifiedInviteTarget: findVerifiedInviteTargetWithDatabase(database),
      findVerifiedSquadEditorInviteTarget:
        findVerifiedSquadEditorInviteTargetWithDatabase(database),
      getAccountForRefetch: getAccountForRefetchWithDatabase(database),
      getSquadGroupDetail: getSquadGroupDetailWithDatabase(database),
      listAccountAccessGrants: listAccountAccessGrantsWithDatabase(database),
      listAvailableCharactersForOwner:
        listAvailableCharactersForOwnerWithDatabase(database),
      listGlobalSquadGroups: listGlobalSquadGroupsWithDatabase(database),
      listIncomingAccountInvites:
        listIncomingAccountInvitesWithDatabase(database),
      listMySquadGroups: listMySquadGroupsWithDatabase(database),
      listOwnedAccounts: listOwnedAccountsWithDatabase(database),
      listSharedAccounts: listSharedAccountsWithDatabase(database),
      markPendingRefetchApplied:
        markPendingRefetchAppliedWithDatabase(database),
      markRequestFailed: markRequestFailedWithDatabase(database),
      markRequestSucceeded: markRequestSucceededWithDatabase(database),
      reserveRequest: reserveRequestWithDatabase(database),
      respondToAccountAccessInvite:
        respondToAccountAccessInviteWithDatabase(database),
      revokeAccountAccess: revokeAccountAccessWithDatabase(database),
      saveSharedSquadGroupCharacters:
        saveSharedSquadGroupCharactersWithDatabase(database),
      saveSquadGroupSnapshot: saveSquadGroupSnapshotWithDatabase(database),
      searchInviteTargets: searchInviteTargetsWithDatabase(database),
      searchSquadEditorInviteTargets:
        searchSquadEditorInviteTargetsWithDatabase(database),
      setSquadGroupVisibility: setSquadGroupVisibilityWithDatabase(database),
      upsertAccountAccessInvite:
        upsertAccountAccessInviteWithDatabase(database),
      upsertSquadGroupEditorInvite:
        upsertSquadGroupEditorInviteWithDatabase(database),
    })
  )
);
