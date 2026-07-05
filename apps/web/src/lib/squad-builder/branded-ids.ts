import { AppUserIdSchema } from "@tepirek-revamped/api/modules/squad-builder/app-user-id";
import { MargonemAccountAccessIdSchema } from "@tepirek-revamped/api/modules/squad-builder/margonem-account-access-id";
import { MargonemAccountIdSchema } from "@tepirek-revamped/api/modules/squad-builder/margonem-account-id";
import { PendingMargonemAccountImportIdSchema } from "@tepirek-revamped/api/modules/squad-builder/pending-margonem-account-import-id";
import { PendingMargonemAccountRefetchIdSchema } from "@tepirek-revamped/api/modules/squad-builder/pending-margonem-account-refetch-id";
import { SquadGroupIdSchema } from "@tepirek-revamped/api/modules/squad-builder/squad-group-id";
import { SquadGroupInvitationIdSchema } from "@tepirek-revamped/api/modules/squad-builder/squad-group-invitation-id";
import * as Schema from "effect/Schema";

/** Build an `AppUserId` from a plain string. */
export const asAppUserId = (value: string) =>
  Schema.decodeUnknownSync(AppUserIdSchema)(value);

/** Build a `SquadGroupId` from a plain number. */
export const asSquadGroupId = (value: number) =>
  Schema.decodeUnknownSync(SquadGroupIdSchema)(value);

/** Build a `MargonemAccountId` from a plain number. */
export const asMargonemAccountId = (value: number) =>
  Schema.decodeUnknownSync(MargonemAccountIdSchema)(value);

/** Build a `MargonemAccountAccessId` from a plain number. */
export const asMargonemAccountAccessId = (value: number) =>
  Schema.decodeUnknownSync(MargonemAccountAccessIdSchema)(value);

/** Build a `SquadGroupInvitationId` from a plain number. */
export const asSquadGroupInvitationId = (value: number) =>
  Schema.decodeUnknownSync(SquadGroupInvitationIdSchema)(value);

/** Build a `PendingMargonemAccountImportId` from a plain number. */
export const asPendingMargonemAccountImportId = (value: number) =>
  Schema.decodeUnknownSync(PendingMargonemAccountImportIdSchema)(value);

/** Build a `PendingMargonemAccountRefetchId` from a plain number. */
export const asPendingMargonemAccountRefetchId = (value: number) =>
  Schema.decodeUnknownSync(PendingMargonemAccountRefetchIdSchema)(value);
