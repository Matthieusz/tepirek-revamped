import { AppUserId } from "@tepirek-revamped/api/domain/squad-builder/app-user-id";
import { AnnouncementId } from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import { AuctionSignupId } from "@tepirek-revamped/api/protocol/auction/http-api-contract";
import {
  BetId,
  EventId,
  HeroId,
} from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import {
  ProfessionId,
  SkillId,
  SkillRangeId,
} from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import { TodoId } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import * as Schema from "effect/Schema";

/** Decode an announcement identifier received from browser state. */
export const asAnnouncementId = (value: unknown) =>
  Schema.decodeUnknownEffect(AnnouncementId)(value);

/** Decode an auction-signup identifier received from browser state. */
export const asAuctionSignupId = (value: unknown) =>
  Schema.decodeUnknownEffect(AuctionSignupId)(value);

/** Decode a bet identifier received from browser state. */
export const asBetId = (value: unknown) =>
  Schema.decodeUnknownEffect(BetId)(value);

/** Decode an event identifier received from browser state. */
export const asEventId = (value: unknown) =>
  Schema.decodeUnknownEffect(EventId)(value);

/** Decode a hero identifier received from browser state. */
export const asHeroId = (value: unknown) =>
  Schema.decodeUnknownEffect(HeroId)(value);

/** Decode a profession identifier received from browser state. */
export const asProfessionId = (value: unknown) =>
  Schema.decodeUnknownEffect(ProfessionId)(value);

/** Decode a skill identifier received from browser state. */
export const asSkillId = (value: unknown) =>
  Schema.decodeUnknownEffect(SkillId)(value);

/** Decode a skill-range identifier received from browser state. */
export const asSkillRangeId = (value: unknown) =>
  Schema.decodeUnknownEffect(SkillRangeId)(value);

/** Decode a todo identifier received from browser state. */
export const asTodoId = (value: unknown) =>
  Schema.decodeUnknownEffect(TodoId)(value);

/** Decode an application-user identifier received from browser state. */
export const asAppUserId = (value: unknown) =>
  Schema.decodeUnknownEffect(AppUserId)(value);
