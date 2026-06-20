import { describe, expect, it } from "vitest";

import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("returns the message from Error objects", () => {
    expect(getErrorMessage(new Error("Nie udało się zapisać"))).toBe(
      "Nie udało się zapisać"
    );
  });

  it("returns a fallback for non-Error values", () => {
    for (const value of [null, undefined, "błąd", { message: "błąd" }]) {
      expect(getErrorMessage(value)).toBe("Wystąpił błąd");
    }
  });
});
