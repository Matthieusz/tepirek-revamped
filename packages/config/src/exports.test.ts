import * as auctions from "@tepirek-revamped/config/application/auctions";
import * as events from "@tepirek-revamped/config/application/events";
import * as ledger from "@tepirek-revamped/config/application/guild-ledger";
import * as skills from "@tepirek-revamped/config/application/skills";
import * as users from "@tepirek-revamped/config/application/users";
import { expect, it } from "vite-plus/test";

import * as legacy from "./index.ts";

it("keeps legacy exports as aliases of the explicit application subpaths", () => {
  expect(legacy.calculatePointsPerMember).toBe(ledger.calculatePointsPerMember);
  expect(legacy.POINTS_PER_HERO).toBe(ledger.POINTS_PER_HERO);
  expect(legacy.MIN_EARNINGS).toBe(ledger.MIN_EARNINGS);
  expect(legacy.EVENT_ICON_IDS).toBe(events.EVENT_ICON_IDS);
  expect(legacy.isEventIconId).toBe(events.isEventIconId);
  expect(legacy.USER_ROLES).toBe(users.USER_ROLES);
  expect(legacy.AUCTION_SLOT_COLUMNS).toBe(auctions.AUCTION_SLOT_COLUMNS);
  expect(legacy.isLegalAuctionSlot).toBe(auctions.isLegalAuctionSlot);
  expect(legacy.slugifySkillRangeName).toBe(skills.slugifySkillRangeName);
});
