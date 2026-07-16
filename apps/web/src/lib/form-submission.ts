import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { getErrorMessage } from "@/lib/errors";

class FormSubmissionError extends Schema.TaggedErrorClass<FormSubmissionError>()(
  "FormSubmissionError",
  {
    cause: Schema.Defect(),
    message: Schema.String,
  }
) {}

/** Translates a rejected mutation promise into a typed Effect Form failure. */
export const formSubmission = <A>(promise: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) =>
      new FormSubmissionError({
        cause,
        message: getErrorMessage(
          cause,
          "Nie udało się wykonać operacji. Spróbuj ponownie."
        ),
      }),
    try: promise,
  });
