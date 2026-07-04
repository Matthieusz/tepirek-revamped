import { describe, expect, it } from "vitest";

import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("returns the message from ordinary Error objects", () => {
    expect(getErrorMessage(new Error("Nie udało się zapisać"))).toBe(
      "Nie udało się zapisać"
    );
  });

  it("maps tagged authorization failures to safe UI copy", () => {
    expect(
      getErrorMessage({ _tag: "UserForbidden", message: "raw server copy" })
    ).toBe("Nie masz uprawnień do wykonania tej akcji.");
  });

  it("keeps public validation messages for tagged bad requests", () => {
    expect(
      getErrorMessage({
        _tag: "UserBadRequest",
        message: "Nieprawidłowa nazwa",
      })
    ).toBe("Nieprawidłowa nazwa");
  });

  it("does not expose persistence causes or unknown values", () => {
    for (const value of [
      null,
      undefined,
      "błąd",
      { message: "błąd" },
      { _tag: "UserPersistenceUnavailable", cause: "secret dsn" },
    ]) {
      expect(getErrorMessage(value)).toBe(
        "Wystąpił błąd. Spróbuj ponownie później."
      );
    }
  });
});
