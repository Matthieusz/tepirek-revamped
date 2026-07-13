import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { formSubmission } from "@/lib/form-submission";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("formSubmission", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockReset();
  });

  it("returns the mutation value on success", async () => {
    const result = await Effect.runPromise(
      formSubmission(() => Promise.resolve("created"))
    );

    expect(result).toBe("created");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("keeps provider failures in the error channel and reports them once", async () => {
    const result = await Effect.runPromiseExit(
      formSubmission(() => Promise.reject(new Error("provider failed")))
    );

    expect(Exit.isFailure(result)).toBe(true);
    expect(toast.error).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledWith("provider failed");
  });
});
