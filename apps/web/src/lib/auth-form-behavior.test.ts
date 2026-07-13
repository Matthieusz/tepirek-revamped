import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAuthProviderErrorMessage,
  handleLoginSuccess,
  handleSignupSuccess,
} from "@/lib/auth-form-behavior";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("auth form behavior", () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockReset();
  });

  it("prefers provider messages and falls back to status text", () => {
    expect(
      getAuthProviderErrorMessage({ error: { message: "Niepoprawne dane" } })
    ).toBe("Niepoprawne dane");
    expect(
      getAuthProviderErrorMessage({ error: { statusText: "Unauthorized" } })
    ).toBe("Unauthorized");
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
