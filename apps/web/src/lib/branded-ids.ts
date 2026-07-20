import { AppUserIdSchema } from "@tepirek-revamped/api/domain/squad-builder/app-user-id";
import { AnnouncementIdSchema } from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import { AuctionSignupIdSchema } from "@tepirek-revamped/api/protocol/auction/http-api-contract";
import {
  BetIdSchema,
  EventIdSchema,
  HeroIdSchema,
} from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import {
  ProfessionIdSchema,
  SkillIdSchema,
  SkillRangeIdSchema,
} from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import { TodoIdSchema } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import * as Schema from "effect/Schema";

/** Decode an announcement identifier received from browser state. */
export const asAnnouncementId = (value: unknown) =>
  Schema.decodeUnknownEffect(AnnouncementIdSchema)(value);

/** Decode an auction-signup identifier received from browser state. */
export const asAuctionSignupId = (value: unknown) =>
  Schema.decodeUnknownEffect(AuctionSignupIdSchema)(value);

/** Decode a bet identifier received from browser state. */
export const asBetId = (value: unknown) =>
  Schema.decodeUnknownEffect(BetIdSchema)(value);

/** Decode an event identifier received from browser state. */
export const asEventId = (value: unknown) =>
  Schema.decodeUnknownEffect(EventIdSchema)(value);

/** Decode a hero identifier received from browser state. */
export const asHeroId = (value: unknown) =>
  Schema.decodeUnknownEffect(HeroIdSchema)(value);

/** Decode a profession identifier received from browser state. */
export const asProfessionId = (value: unknown) =>
  Schema.decodeUnknownEffect(ProfessionIdSchema)(value);

/** Decode a skill identifier received from browser state. */
export const asSkillId = (value: unknown) =>
  Schema.decodeUnknownEffect(SkillIdSchema)(value);

/** Decode a skill-range identifier received from browser state. */
export const asSkillRangeId = (value: unknown) =>
  Schema.decodeUnknownEffect(SkillRangeIdSchema)(value);

/** Decode a todo identifier received from browser state. */
export const asTodoId = (value: unknown) =>
  Schema.decodeUnknownEffect(TodoIdSchema)(value);

/** Decode an application-user identifier received from browser state. */
export const asUserId = (value: unknown) =>
  Schema.decodeUnknownEffect(AppUserIdSchema)(value);
