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
export const asAnnouncementId = Schema.decodeUnknownEffect(AnnouncementId);

/** Decode an auction-signup identifier received from browser state. */
export const asAuctionSignupId = Schema.decodeUnknownEffect(AuctionSignupId);

/** Decode a bet identifier received from browser state. */
export const asBetId = Schema.decodeUnknownEffect(BetId);

/** Decode an event identifier received from browser state. */
export const asEventId = Schema.decodeUnknownEffect(EventId);

/** Decode a hero identifier received from browser state. */
export const asHeroId = Schema.decodeUnknownEffect(HeroId);

/** Decode a profession identifier received from browser state. */
export const asProfessionId = Schema.decodeUnknownEffect(ProfessionId);

/** Decode a skill identifier received from browser state. */
export const asSkillId = Schema.decodeUnknownEffect(SkillId);

/** Decode a skill-range identifier received from browser state. */
export const asSkillRangeId = Schema.decodeUnknownEffect(SkillRangeId);

/** Decode a todo identifier received from browser state. */
export const asTodoId = Schema.decodeUnknownEffect(TodoId);

/** Decode an application-user identifier received from browser state. */
export const asAppUserId = Schema.decodeUnknownEffect(AppUserId);
