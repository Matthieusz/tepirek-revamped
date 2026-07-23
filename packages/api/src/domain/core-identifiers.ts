import * as Schema from "effect/Schema";

const PositiveInt = Schema.Finite.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

const brandedPositiveInt = <const Brand extends string>(
  brand: Brand,
  identifier: Brand
) => PositiveInt.pipe(Schema.brand(brand)).annotate({ identifier });

/** A persisted announcement row id. */
export const AnnouncementId = brandedPositiveInt(
  "AnnouncementId",
  "AnnouncementId"
);
export type AnnouncementId = typeof AnnouncementId.Type;
export const AnnouncementIdSchema = AnnouncementId;

/** A persisted auction signup row id. */
export const AuctionSignupId = brandedPositiveInt(
  "AuctionSignupId",
  "AuctionSignupId"
);
export type AuctionSignupId = typeof AuctionSignupId.Type;
export const AuctionSignupIdSchema = AuctionSignupId;

/** A persisted hero bet row id. */
export const BetId = brandedPositiveInt("BetId", "BetId");
export type BetId = typeof BetId.Type;
export const BetIdSchema = BetId;

/** A persisted event row id. */
export const EventId = brandedPositiveInt("EventId", "EventId");
export type EventId = typeof EventId.Type;
export const EventIdSchema = EventId;

/** A persisted hero row id. */
export const HeroId = brandedPositiveInt("HeroId", "HeroId");
export type HeroId = typeof HeroId.Type;
export const HeroIdSchema = HeroId;

/** A persisted profession row id. */
export const ProfessionId = brandedPositiveInt("ProfessionId", "ProfessionId");
export type ProfessionId = typeof ProfessionId.Type;
export const ProfessionIdSchema = ProfessionId;

/** A persisted skill range row id. */
export const SkillRangeId = brandedPositiveInt("SkillRangeId", "SkillRangeId");
export type SkillRangeId = typeof SkillRangeId.Type;
export const SkillRangeIdSchema = SkillRangeId;

/** A persisted skill row id. */
export const SkillId = brandedPositiveInt("SkillId", "SkillId");
export type SkillId = typeof SkillId.Type;
export const SkillIdSchema = SkillId;

/** A persisted todo row id. */
export const TodoId = brandedPositiveInt("TodoId", "TodoId");
export type TodoId = typeof TodoId.Type;
export const TodoIdSchema = TodoId;
