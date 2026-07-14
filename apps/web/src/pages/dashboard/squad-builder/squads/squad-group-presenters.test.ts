import { describe, expect, it } from "vitest";

import {
  formatCharacterCount,
  formatSquadCount,
  userInitials,
} from "./squad-group-presenters";

describe("squad group presenters", () => {
  it("uses natural Polish count labels", () => {
    expect(formatCharacterCount(1)).toBe("1 postać");
    expect(formatCharacterCount(2)).toBe("2 postacie");
    expect(formatCharacterCount(5)).toBe("5 postaci");
    expect(formatSquadCount(1)).toBe("1 skład");
    expect(formatSquadCount(3)).toBe("3 składy");
    expect(formatSquadCount(8)).toBe("8 składów");
  });

  it("builds initials from the first two words", () => {
    expect(userInitials("Ala Kowalska")).toBe("AK");
    expect(userInitials("  jaruna  ")).toBe("J");
    expect(userInitials("")).toBe("");
  });
});
