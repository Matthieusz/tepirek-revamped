import { EVENT_ICON_IDS } from "@tepirek-revamped/config";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { ALL_FILTER } from "@/features/events/core/event-hero-filter";
import {
  AccountDisplayNameSchema,
  CalculatorItemLevelSchema,
  CalculatorLevelSchema,
  CalculatorLevelsSchema,
  EmailSchema,
  EventColorSchema,
  EventDateSchema,
  EventFormDefaults,
  EventIconSchema,
  EventNameSchema,
  GoldAmountSchema,
  HeroEventIdSchema,
  HeroNameSchema,
  NonEmptyUserIdsSchema,
  OptionalLevelSchema,
  PasswordSchema,
  ProfileUrlsSchema,
  RequiredSelectionSchema,
  SignupNameSchema,
  SkillLinkSchema,
  SkillNameSchema,
  SkillProfessionIdSchema,
  SquadFilterNameSchema,
  TodoTextSchema,
  validateSquadFilterLevelOrder,
} from "@/lib/form-schemas";

const succeeds = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  value: unknown
): S["Type"] => {
  const result = Schema.decodeUnknownExit(schema)(value);
  expect(Exit.isSuccess(result)).toBe(true);
  if (Exit.isFailure(result)) {
    throw new Error("Expected schema decoding to succeed");
  }
  return result.value;
};

const fails = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  value: unknown
): void => {
  expect(Exit.isFailure(Schema.decodeUnknownExit(schema)(value))).toBe(true);
};

describe("form schemas", () => {
  describe("authentication", () => {
    it("accepts valid login and signup values", () => {
      expect(succeeds(EmailSchema, "ala@example.com")).toBe("ala@example.com");
      expect(succeeds(SignupNameSchema, "Ala")).toBe("Ala");
      expect(succeeds(SkillLinkSchema, "https://example.com/skills")).toContain(
        "https://"
      );
    });

    it("rejects malformed provider credentials before submission", () => {
      fails(EmailSchema, "not-an-email");
      fails(SignupNameSchema, "A");
      fails(SkillNameSchema, "");
    });

    it("requires an eight-character password", () => {
      fails(PasswordSchema, "short");
      expect(succeeds(PasswordSchema, "long-enough")).toBe("long-enough");
    });
  });

  describe("event, hero, and skill controls", () => {
    it("keeps event date, icon, and color values decodable", () => {
      const date = new Date("2026-07-13T12:00:00.000Z");
      expect(succeeds(EventDateSchema, date)).toBe(date);
      expect(succeeds(EventIconSchema, EVENT_ICON_IDS[0])).toBe(
        EVENT_ICON_IDS[0]
      );
      expect(succeeds(EventColorSchema, "#6366f1")).toBe("#6366f1");
      fails(EventDateSchema, null);
      fails(EventNameSchema, "   ");
      expect(EventFormDefaults).toMatchObject({
        color: "#6366f1",
        date: null,
        name: "",
      });
    });

    it("requires event, hero, and skill profession selections", () => {
      fails(HeroEventIdSchema, "");
      fails(HeroNameSchema, " ");
      expect(succeeds(SkillProfessionIdSchema, "3")).toBe(3);
      fails(SkillProfessionIdSchema, "");
    });
  });

  describe("bet and gold selections", () => {
    it("rejects an empty member selection", () => {
      expect(
        succeeds(NonEmptyUserIdsSchema, ["first-user", "second-user"])
      ).toEqual(["first-user", "second-user"]);
      fails(NonEmptyUserIdsSchema, []);
    });

    it("validates gold amounts and concrete selections", () => {
      expect(succeeds(GoldAmountSchema, "2g")).toBe("2g");
      fails(GoldAmountSchema, "0");
      fails(GoldAmountSchema, "not-gold");
      fails(RequiredSelectionSchema("Wybierz event"), ALL_FILTER);
      expect(succeeds(RequiredSelectionSchema("Wybierz event"), "42")).toBe(42);
    });
  });

  describe("account import and squad forms", () => {
    it("normalizes account profile lines and enforces the import limit", () => {
      expect(succeeds(ProfileUrlsSchema, " first\n\nsecond ")).toEqual([
        "first",
        "second",
      ]);
      fails(ProfileUrlsSchema, "\n \n");
      fails(
        ProfileUrlsSchema,
        Array.from({ length: 21 }, (_, i) => `url-${i}`).join("\n")
      );
    });

    it("validates task, account, and squad mutation fields", () => {
      expect(succeeds(TodoTextSchema, "Nowe zadanie")).toBe("Nowe zadanie");
      fails(TodoTextSchema, "   ");
      expect(succeeds(AccountDisplayNameSchema, " Konto ")).toBe(" Konto ");
      fails(AccountDisplayNameSchema, " ");
      fails(AccountDisplayNameSchema, "x".repeat(81));
      fails(SquadFilterNameSchema, "x");
      expect(succeeds(OptionalLevelSchema, "")).toBe("");
      expect(succeeds(OptionalLevelSchema, "120")).toBe("120");
      fails(OptionalLevelSchema, "0");
      fails(OptionalLevelSchema, "12.5");
    });

    it("routes an invalid squad level range to the upper bound field", () => {
      expect(
        validateSquadFilterLevelOrder({ maxLevel: "10", minLevel: "20" })
      ).toEqual({
        issue: "Poziom od nie może być większy niż poziom do",
        path: ["maxLevel"],
      });
      expect(
        validateSquadFilterLevelOrder({ maxLevel: "20", minLevel: "10" })
      ).toBe(true);
    });
  });

  describe("calculator inputs", () => {
    it("accepts boundaries and rejects malformed levels", () => {
      expect(succeeds(CalculatorLevelSchema, 1)).toBe(1);
      expect(succeeds(CalculatorLevelSchema, 500)).toBe(500);
      fails(CalculatorLevelSchema, 0);
      fails(CalculatorLevelSchema, 500.5);
      expect(succeeds(CalculatorItemLevelSchema, 300)).toBe(300);
      fails(CalculatorItemLevelSchema, 301);
      fails(CalculatorLevelsSchema, "abc, -1");
      expect(succeeds(CalculatorLevelsSchema, "200, malformed, 150")).toContain(
        "200"
      );
    });
  });
});
