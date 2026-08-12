import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type { Effect } from "effect/Effect";

import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  SquadBuilderPersistenceUnavailable,
  MargonemAccountAlreadyOwnedByActor,
  MargonemAccountAlreadySharedWithActor,
  MargonemAccountOwnedByAnotherUser,
  MargonemAccountNotFound,
  PendingMargonemAccountImportNotFound,
} from "../squad-groups/squad-group-errors.ts";

/** Access state for a Margonem profile relative to the current user. */
export type ProfileAccessState = Data.TaggedEnum<{
  readonly Available: Record<never, never>;
  readonly OwnedByActor: Record<never, never>;
  readonly OwnedByAnotherUser: Record<never, never>;
  readonly SharedWithActor: Record<never, never>;
}>;
export const ProfileAccessState = Data.taggedEnum<ProfileAccessState>();

/** Input for checking whether a profile can be imported. */
export interface FindProfileAccessStateInput {
  readonly profileId: MargonemProfileId;
  readonly actorUserId: AppUserId;
}

/** Expected duplicate/access failures for owned account imports. */
export type DuplicateMargonemAccountError =
  | MargonemAccountAlreadyOwnedByActor
  | MargonemAccountOwnedByAnotherUser
  | MargonemAccountAlreadySharedWithActor;

/** Input for storing a successful preview as a pending import. */
export interface CreatePendingMargonemAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly expiresAt: Date;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Stored pending import identity. */
interface PendingMargonemAccountImport {
  readonly id: PendingMargonemAccountImportId;
  readonly profileId: MargonemProfileId;
}

/** Input for atomically confirming and consuming a pending import. */
export interface ConfirmPendingImportInput {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly displayName: AccountDisplayName;
  readonly now: Date;
}

/** Small character identity preview shown in the owned accounts list. */
interface OwnedAccountCharacterPreview {
  readonly characterId: number;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly profession: string;
}

/** Read model for one owned Margonem account. */
export interface OwnedMargonemAccountSummary {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly lastFetchedAt: Date;
  readonly characterCount: number;
  readonly characterPreviews: readonly OwnedAccountCharacterPreview[];
}

/** Input for changing an owned account display name. */
export interface UpdateOwnedAccountDisplayNameInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly displayName: AccountDisplayName;
  readonly now: Date;
}

/** Input for deleting an owned account and its linked data. */
export interface DeleteOwnedAccountInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

/** Impact counts returned after deleting an owned account. */
interface DeleteOwnedAccountResult {
  readonly accountId: MargonemAccountId;
  readonly removedCharacterCount: number;
  readonly removedSquadCharacterCount: number;
  readonly removedAccessGrantCount: number;
}

/** Input for listing owned Margonem accounts. */
export interface ListOwnedMargonemAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Persistence operations used by account import workflows. */
export interface AccountImportStoreContract {
  readonly listOwnedAccounts: (
    input: ListOwnedMargonemAccountsInput
  ) => Effect<
    readonly OwnedMargonemAccountSummary[],
    SquadBuilderPersistenceUnavailable
  >;
  readonly updateOwnedAccountDisplayName: (
    input: UpdateOwnedAccountDisplayNameInput
  ) => Effect<
    OwnedMargonemAccountSummary,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | SquadBuilderPersistenceUnavailable
  >;
  readonly deleteOwnedAccount: (
    input: DeleteOwnedAccountInput
  ) => Effect<
    DeleteOwnedAccountResult,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | SquadBuilderPersistenceUnavailable
  >;
  readonly findProfileAccessState: (
    input: FindProfileAccessStateInput
  ) => Effect<ProfileAccessState, SquadBuilderPersistenceUnavailable>;
  readonly createPendingImport: (
    input: CreatePendingMargonemAccountImportInput
  ) => Effect<PendingMargonemAccountImport, SquadBuilderPersistenceUnavailable>;
  readonly confirmPendingImport: (
    input: ConfirmPendingImportInput
  ) => Effect<
    OwnedMargonemAccountSummary,
    | PendingMargonemAccountImportNotFound
    | DuplicateMargonemAccountError
    | SquadBuilderPersistenceUnavailable
  >;
}

export class AccountImportStoreService extends Context.Service<
  AccountImportStoreService,
  AccountImportStoreContract
>()("@tepirek-revamped/api/squad-builder/AccountImportStoreService") {}
