import { expect, it } from "vite-plus/test";

import { userInitials } from "@/features/squad-builder/shared/user-presenters";

it("builds avatar initials from the first two words", () => {
  expect(userInitials("  Jan   Kowalski Nowak ")).toBe("JK");
  expect(userInitials("żmija")).toBe("Ż");
  expect(userInitials("   ")).toBe("");
});
