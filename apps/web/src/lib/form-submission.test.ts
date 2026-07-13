import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";

import { formSubmission } from "@/lib/form-submission";

describe("formSubmission", () => {
  it("returns the mutation value on success", async () => {
    const result = await Effect.runPromise(
      formSubmission(() => Promise.resolve("created"))
    );

    expect(result).toBe("created");
  });

  it("keeps provider failures in the typed error channel", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        formSubmission(() => Promise.reject(new Error("provider failed")))
      )
    );

    expect(error).toMatchObject({
      _tag: "FormSubmissionError",
      message: "provider failed",
    });
  });
});
