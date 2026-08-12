import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { getErrorMessage } from "@/lib/errors";

export class FormSubmissionError extends Schema.TaggedErrorClass<FormSubmissionError>()(
  "FormSubmissionError",
  {
    cause: Schema.Defect(),
    message: Schema.String,
  }
) {}

/** The result of a mutation that is safe to render from a form component. */
export type FormSubmissionResult<A> =
  | { readonly _tag: "success"; readonly value: A }
  | { readonly _tag: "failure"; readonly error: FormSubmissionError };

/** Translates a rejected mutation promise into a typed Effect Form failure. */
export const formSubmission = <A>(promise: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => {
      if (!(cause instanceof Error)) {
        throw cause;
      }

      return new FormSubmissionError({
        cause,
        message: getErrorMessage(
          cause,
          "Nie udało się wykonać operacji. Spróbuj ponownie."
        ),
      });
    },
    try: promise,
  });

/** Runs a mutation and returns expected failures as values for TanStack submit handlers. */
export const runFormSubmission = async <A>(
  promise: () => Promise<A>
): Promise<FormSubmissionResult<A>> => {
  try {
    return {
      _tag: "success",
      value: await Effect.runPromise(formSubmission(promise)),
    };
  } catch (error: unknown) {
    if (Schema.is(FormSubmissionError)(error)) {
      return { _tag: "failure", error };
    }

    throw error;
  }
};
