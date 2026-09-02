import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { beforeEach, vi } from "vitest";

import {
  authFormSubmission,
  runAuthFormSubmission,
  getAuthProviderErrorMessage,
  handleLoginSuccess,
  handleSignupSuccess,
} from "@/lib/auth-form-behavior";

const notifications: string[] = [];
const notifySuccess = (message: string): void => {
  notifications.push(message);
};

describe("auth form behavior", () => {
  beforeEach(() => {
    notifications.length = 0;
  });

  it("prefers provider messages and falls back to status text", () => {
    expect(getAuthProviderErrorMessage({ message: "Niepoprawne dane" })).toBe(
      "Niepoprawne dane"
    );
    expect(getAuthProviderErrorMessage({ statusText: "Unauthorized" })).toBe(
      "Unauthorized"
    );
  });

  it.effect(
    "translates a rejected request into a typed failure without leaking its cause",
    () =>
      Effect.gen(function* translateRequestFailure() {
        const error = yield* Effect.flip(
          authFormSubmission(
            "login",
            async () =>
              await Promise.reject(new Error("provider URL and token"))
          )
        );

        expect(error).toMatchObject({
          _tag: "AuthFormSubmissionError",
          kind: "request",
          message: "Nie udało się połączyć z usługą uwierzytelniania",
          operation: "login",
        });
        expect(error).not.toHaveProperty("url");
        expect(error).not.toHaveProperty("token");
        expect(notifications).toEqual([]);
      })
  );

  it.effect("translates provider-declared failures and reports them once", () =>
    Effect.gen(function* translateProviderFailure() {
      const error = yield* Effect.flip(
        authFormSubmission(
          "signup",
          async () =>
            await Promise.resolve({
              data: null,
              error: {
                code: "INVALID_EMAIL",
                message: "Niepoprawny e-mail",
                status: 400,
                statusText: "Bad Request",
              },
            })
        )
      );

      expect(error).toMatchObject({
        _tag: "AuthFormSubmissionError",
        code: "INVALID_EMAIL",
        kind: "provider",
        message: "Niepoprawny e-mail",
        operation: "signup",
        status: 400,
      });
      expect(notifications).toEqual([]);
    })
  );

  it("returns auth success and typed provider failure as values", async () => {
    await expect(
      runAuthFormSubmission(
        "login",
        async () => await Promise.resolve({ data: null, error: null })
      )
    ).resolves.toEqual({ _tag: "success" });

    const result = await runAuthFormSubmission(
      "login",
      async () =>
        await Promise.resolve({
          data: null,
          error: { message: "Niepoprawne dane", status: 401 },
        })
    );
    expect(result._tag).toBe("failure");
    if (result._tag === "failure") {
      expect(result.error.message).toBe("Niepoprawne dane");
    }
  });

  it("invalidates before navigating after login", async () => {
    const calls: string[] = [];

    await handleLoginSuccess({
      invalidate: async () => {
        calls.push("invalidate");
        await Promise.resolve();
      },
      navigate: async () => {
        calls.push("navigate");
        await Promise.resolve();
      },
      notifySuccess,
    });

    expect(calls).toEqual(["invalidate", "navigate"]);
    expect(notifications).toEqual(["Zalogowano pomyślnie"]);
  });

  it("navigates before announcing successful signup", async () => {
    const navigate = vi.fn(async () => {
      await Promise.resolve();
    });

    await handleSignupSuccess({ navigate, notifySuccess });

    expect(navigate).toHaveBeenCalledOnce();
    expect(notifications).toEqual(["Zarejestrowano pomyślnie"]);
  });
});
