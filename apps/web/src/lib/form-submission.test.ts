import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { formSubmission, runFormSubmission } from "@/lib/form-submission";

describe("formSubmission", () => {
  it.effect("returns the mutation value on success", () =>
    Effect.gen(function* submitForm() {
      const result = yield* formSubmission(
        async () => await Promise.resolve("created")
      );

      expect(result).toBe("created");
    })
  );

  it.effect("keeps provider failures in the typed error channel", () =>
    Effect.gen(function* translateProviderFailure() {
      const error = yield* Effect.flip(
        formSubmission(
          async () => await Promise.reject(new Error("provider failed"))
        )
      );

      expect(error).toMatchObject({
        _tag: "FormSubmissionError",
        message: "Nie udało się wykonać operacji. Spróbuj ponownie.",
      });
    })
  );

  it("returns success and expected failure as values for TanStack handlers", async () => {
    await expect(
      runFormSubmission(async () => await Promise.resolve("created"))
    ).resolves.toEqual({
      _tag: "success",
      value: "created",
    });

    const result = await runFormSubmission(
      async () => await Promise.reject(new Error("provider failed"))
    );
    expect(result._tag).toBe("failure");
    if (result._tag === "failure") {
      expect(result.error.message).toBe(
        "Nie udało się wykonać operacji. Spróbuj ponownie."
      );
    }
  });

  it("does not turn non-Error defects into user-facing failures", async () => {
    await expect(
      // oxlint-disable-next-line prefer-promise-reject-errors
      runFormSubmission(async () => await Promise.reject("unexpected defect"))
    ).rejects.toBe("unexpected defect");
  });
});
