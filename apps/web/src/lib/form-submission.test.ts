import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { formSubmission, runFormSubmission } from "@/lib/form-submission";

describe("formSubmission", () => {
  it.effect("returns the mutation value on success", () =>
    Effect.gen(function* submitForm() {
      const result = yield* formSubmission(() => Promise.resolve("created"));

      expect(result).toBe("created");
    })
  );

  it.effect("keeps provider failures in the typed error channel", () =>
    Effect.gen(function* translateProviderFailure() {
      const error = yield* Effect.flip(
        formSubmission(() => Promise.reject(new Error("provider failed")))
      );

      expect(error).toMatchObject({
        _tag: "FormSubmissionError",
        message: "provider failed",
      });
    })
  );

  it("returns success and expected failure as values for TanStack handlers", async () => {
    await expect(
      runFormSubmission(() => Promise.resolve("created"))
    ).resolves.toEqual({
      _tag: "success",
      value: "created",
    });

    const result = await runFormSubmission(() =>
      Promise.reject(new Error("provider failed"))
    );
    expect(result._tag).toBe("failure");
    if (result._tag === "failure") {
      expect(result.error.message).toBe("provider failed");
    }
  });

  it("does not turn non-Error defects into user-facing failures", async () => {
    await expect(
      // oxlint-disable-next-line prefer-promise-reject-errors
      runFormSubmission(() => Promise.reject("unexpected defect"))
    ).rejects.toBe("unexpected defect");
  });
});
