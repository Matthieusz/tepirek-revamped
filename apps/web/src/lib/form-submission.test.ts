import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { formSubmission } from "@/lib/form-submission";

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
});
