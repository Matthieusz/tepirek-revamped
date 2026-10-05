import { describe, expect, it } from "vitest";

import { AUCTION_PROFESSION_META, AUCTION_PROFESSIONS } from "./config";

describe("auction profession icons", () => {
  it.each(AUCTION_PROFESSIONS)(
    "uses the same icon on cards and detail pages for %s",
    (profession) => {
      const metadata = AUCTION_PROFESSION_META[profession];

      expect(metadata.headerIcon).toBe(metadata.cardIcon.main);
      expect(metadata.headerIcon).toBe(metadata.cardIcon.support);
    }
  );
});
