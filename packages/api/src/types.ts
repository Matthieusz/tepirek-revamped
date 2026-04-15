import {
  AUCTION_PROFESSIONS,
  AUCTION_TYPES,
  EVENT_ICON_IDS,
  USER_ROLES,
} from "@tepirek-revamped/config";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Type re-exports
// ---------------------------------------------------------------------------

export type {
  UserRole,
  AuctionType,
  AuctionProfession,
  EventIconId,
} from "@tepirek-revamped/config";

// ---------------------------------------------------------------------------
// Shared Zod schemas for router input validation
// ---------------------------------------------------------------------------

export const userIdSchema = z.string().min(1);

export const roleSchema = z.enum(USER_ROLES);

export const auctionTypeSchema = z.enum(AUCTION_TYPES);

export const auctionProfessionSchema = z.enum(AUCTION_PROFESSIONS);

export const eventIconIdSchema = z.enum(EVENT_ICON_IDS);
