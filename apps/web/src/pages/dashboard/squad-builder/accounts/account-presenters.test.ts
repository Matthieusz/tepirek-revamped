import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

import { getProfessionPresentation } from "../profession-presenters";
import {
  changeFieldLabel,
  formatChangeValue,
  formatProfession,
  userInitials,
} from "./account-presenters";

describe("account presenters", () => {
  it("localizes known professions and preserves unknown values", () => {
    expect(formatProfession("bladeDancer")).toBe("Tancerz ostrzy");
    expect(formatProfession("newProfession")).toBe("newProfession");
  });

  it("shares distinct icon and color metadata for known professions", () => {
    const professions = [
      "bladeDancer",
      "hunter",
      "mage",
      "paladin",
      "tracker",
      "warrior",
    ].map(getProfessionPresentation);

    expect(
      Arr.dedupe(professions.map((profession) => profession.icon))
    ).toHaveLength(6);
    expect(
      Arr.dedupe(professions.map((profession) => profession.colorClass))
    ).toHaveLength(6);
  });

  it("keeps unknown professions readable and neutral", () => {
    const presentation = getProfessionPresentation("futureProfession");

    expect(presentation.label).toBe("futureProfession");
    expect(presentation.colorClass).toBe("text-muted-foreground");
  });

  it("formats character changes", () => {
    expect(changeFieldLabel("level")).toBe("Poziom");
    expect(changeFieldLabel("futureField")).toBe("futureField");
    expect(formatChangeValue(null)).toBe("brak");
    expect(formatChangeValue(123)).toBe("123");
    expect(formatChangeValue("warrior")).toBe("Wojownik");
  });

  it("creates stable two-part avatar initials", () => {
    expect(userInitials("  Jan   Kowalski Nowak ")).toBe("JK");
    expect(userInitials("żmija")).toBe("Ż");
    expect(userInitials("   ")).toBe("");
  });
});
