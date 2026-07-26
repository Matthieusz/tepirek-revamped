import { expect, it } from "vitest";

import { userInitials } from "./user-presenters";

it("builds avatar initials from the first two words", () => {
  expect(userInitials("  Jan   Kowalski Nowak ")).toBe("JK");
  expect(userInitials("żmija")).toBe("Ż");
  expect(userInitials("   ")).toBe("");
});
