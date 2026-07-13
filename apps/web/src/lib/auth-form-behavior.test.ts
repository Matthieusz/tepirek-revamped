import * as Effect from "effect/Effect";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  authFormSubmission,
  getAuthProviderErrorMessage,
  handleLoginSuccess,
  handleSignupSuccess,
  submitWhenIdle,
} from "@/lib/auth-form-behavior";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("auth form behavior", () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockReset();
  });

  it("prefers provider messages and falls back to status text", () => {
    expect(getAuthProviderErrorMessage({ message: "Niepoprawne dane" })).toBe(
      "Niepoprawne dane"
    );
    expect(getAuthProviderErrorMessage({ statusText: "Unauthorized" })).toBe(
      "Unauthorized"
    );
  });

  it("does not start a duplicate submit while the first request is waiting", () => {
    const submit = vi.fn(() => "submitted");

    expect(submitWhenIdle(true, submit)).toBeUndefined();
    expect(submit).not.toHaveBeenCalled();
    expect(submitWhenIdle(false, submit)).toBe("submitted");
    expect(submit).toHaveBeenCalledOnce();
  });

  it("translates a rejected request into a typed failure without leaking its cause", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        authFormSubmission("login", () =>
          Promise.reject(new Error("provider URL and token"))
        )
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
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("translates provider-declared failures and reports them once", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        authFormSubmission("signup", () =>
          Promise.resolve({
            data: null,
            error: {
              code: "INVALID_EMAIL",
              message: "Niepoprawny e-mail",
              status: 400,
              statusText: "Bad Request",
            },
          })
        )
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
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("invalidates before navigating after login", async () => {
    const calls: string[] = [];

    await handleLoginSuccess({
      invalidate: () => {
        calls.push("invalidate");
        return Promise.resolve();
      },
      navigate: () => {
        calls.push("navigate");
        return Promise.resolve();
      },
    });

    expect(calls).toEqual(["invalidate", "navigate"]);
    expect(toast.success).toHaveBeenCalledWith("Zalogowano pomyślnie");
  });

  it("navigates before announcing successful signup", async () => {
    const navigate = vi.fn(() => Promise.resolve());

    await handleSignupSuccess(navigate);

    expect(navigate).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("Zarejestrowano pomyślnie");
  });
});
