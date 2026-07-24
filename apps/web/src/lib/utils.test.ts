import { describe, expect, it } from "vitest";

import { cn, formatDate, formatDateTime } from "./utils";

describe("web utils", () => {
  it("formats valid dates with the Polish locale", () => {
    expect(formatDate(new Date("2030-01-02T03:04:05.000Z"))).toBe("02-01-2030");
    expect(formatDate("2030-01-02T03:04:05.000Z")).toBe("02-01-2030");
    expect(formatDate(Date.UTC(2030, 0, 2, 3, 4, 5))).toBe("02-01-2030");
  });

  it("returns an empty string for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("");
  });

  it("formats date and time", () => {
    expect(formatDateTime("2030-01-02T03:04:05.000Z")).toMatch(
      /^02\.01\.2030 \d{2}:04$/u
    );
  });

  it("merges conflicting Tailwind classes", () => {
    expect(cn("p-2", "p-4", false)).toBe("p-4");
  });
});
