import { MargonemAccountAccessId } from "@tepirek-revamped/api/domain/squad-builder/margonem-account-access-id";
import { MargonemAccountId } from "@tepirek-revamped/api/domain/squad-builder/margonem-account-id";
import { PendingMargonemAccountImportId } from "@tepirek-revamped/api/domain/squad-builder/pending-margonem-account-import-id";
import { PendingMargonemAccountRefetchId } from "@tepirek-revamped/api/domain/squad-builder/pending-margonem-account-refetch-id";
import { SquadGroupId } from "@tepirek-revamped/api/domain/squad-builder/squad-group-id";
import { SquadGroupInvitationId } from "@tepirek-revamped/api/domain/squad-builder/squad-group-invitation-id";
import { SquadId } from "@tepirek-revamped/api/domain/squad-builder/squad-id";
import * as Schema from "effect/Schema";

/** Build a `SquadGroupId` from a plain number. */
export const asSquadGroupId = (value: number) =>
  Schema.decodeUnknownEffect(SquadGroupId)(value);

/** Build a `SquadId` from a plain number. */
export const asSquadId = (value: number) =>
  Schema.decodeUnknownEffect(SquadId)(value);

/** Build a `MargonemAccountId` from a plain number. */
export const asMargonemAccountId = (value: number) =>
  Schema.decodeUnknownEffect(MargonemAccountId)(value);

/** Build a `MargonemAccountAccessId` from a plain number. */
export const asMargonemAccountAccessId = (value: number) =>
  Schema.decodeUnknownEffect(MargonemAccountAccessId)(value);

/** Build a `SquadGroupInvitationId` from a plain number. */
export const asSquadGroupInvitationId = (value: number) =>
  Schema.decodeUnknownEffect(SquadGroupInvitationId)(value);

/** Build a `PendingMargonemAccountImportId` from a plain number. */
export const asPendingMargonemAccountImportId = (value: number) =>
  Schema.decodeUnknownEffect(PendingMargonemAccountImportId)(value);

/** Build a `PendingMargonemAccountRefetchId` from a plain number. */
export const asPendingMargonemAccountRefetchId = (value: number) =>
  Schema.decodeUnknownEffect(PendingMargonemAccountRefetchId)(value);
