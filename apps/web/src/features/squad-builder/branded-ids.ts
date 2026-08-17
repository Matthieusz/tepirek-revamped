import { MargonemAccountAccessId } from "@tepirek-revamped/api/domain/squad-builder/margonem-account-access-id";
import { MargonemAccountId } from "@tepirek-revamped/api/domain/squad-builder/margonem-account-id";
import { PendingMargonemAccountImportId } from "@tepirek-revamped/api/domain/squad-builder/pending-margonem-account-import-id";
import { PendingMargonemAccountRefetchId } from "@tepirek-revamped/api/domain/squad-builder/pending-margonem-account-refetch-id";
import { SquadGroupId } from "@tepirek-revamped/api/domain/squad-builder/squad-group-id";
import { SquadGroupInvitationId } from "@tepirek-revamped/api/domain/squad-builder/squad-group-invitation-id";
import { SquadId } from "@tepirek-revamped/api/domain/squad-builder/squad-id";
import * as Schema from "effect/Schema";

/** Build a `SquadGroupId` from a plain number. */
export const asSquadGroupId = Schema.decodeUnknownEffect(SquadGroupId);

/** Build a `SquadId` from a plain number. */
export const asSquadId = Schema.decodeUnknownEffect(SquadId);

/** Build a `MargonemAccountId` from a plain number. */
export const asMargonemAccountId =
  Schema.decodeUnknownEffect(MargonemAccountId);

/** Build a `MargonemAccountAccessId` from a plain number. */
export const asMargonemAccountAccessId = Schema.decodeUnknownEffect(
  MargonemAccountAccessId
);

/** Build a `SquadGroupInvitationId` from a plain number. */
export const asSquadGroupInvitationId = Schema.decodeUnknownEffect(
  SquadGroupInvitationId
);

/** Build a `PendingMargonemAccountImportId` from a plain number. */
export const asPendingMargonemAccountImportId = Schema.decodeUnknownEffect(
  PendingMargonemAccountImportId
);

/** Build a `PendingMargonemAccountRefetchId` from a plain number. */
export const asPendingMargonemAccountRefetchId = Schema.decodeUnknownEffect(
  PendingMargonemAccountRefetchId
);
