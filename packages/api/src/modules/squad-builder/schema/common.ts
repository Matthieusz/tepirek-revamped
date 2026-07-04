import * as Schema from "effect/Schema";

export const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

export const AppUserIdSchema = Schema.NonEmptyString.annotate({
  identifier: "AppUserId",
});
export const MargonemAccountIdSchema = PositiveInt.annotate({
  identifier: "MargonemAccountId",
});
export const MargonemAccountAccessIdSchema = PositiveInt.annotate({
  identifier: "MargonemAccountAccessId",
});
export const MargonemProfileIdSchema = PositiveInt.annotate({
  identifier: "MargonemProfileId",
});
export const PendingMargonemAccountImportIdSchema = PositiveInt.annotate({
  identifier: "PendingMargonemAccountImportId",
});
export const PendingMargonemAccountRefetchIdSchema = PositiveInt.annotate({
  identifier: "PendingMargonemAccountRefetchId",
});
export const SquadGroupIdSchema = PositiveInt.annotate({
  identifier: "SquadGroupId",
});
export const SquadGroupInvitationIdSchema = PositiveInt.annotate({
  identifier: "SquadGroupInvitationId",
});

export const AccountAccessStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
export const ActiveAccountAccessStatusSchema = Schema.Literals([
  "pending",
  "accepted",
]);
export const SquadGroupInvitationStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
export const ActiveSquadGroupInvitationStatusSchema = Schema.Literals([
  "pending",
  "accepted",
]);
export const InviteResponseSchema = Schema.Literals(["accept", "decline"]);
export const MargonemProfessionSchema = Schema.Literals([
  "warrior",
  "paladin",
  "bladeDancer",
  "mage",
  "hunter",
  "tracker",
]);

export const MargonemCharacterPreviewSchema = Schema.Struct({
  avatarUrl: Schema.NullOr(Schema.String),
  characterId: PositiveInt,
  level: PositiveInt,
  name: Schema.String,
  profession: MargonemProfessionSchema,
  world: Schema.String,
});

export const ActorPayload = Schema.Struct({ actorUserId: AppUserIdSchema });
export const SquadBuilderServiceError = Schema.Struct({ _tag: Schema.String });
