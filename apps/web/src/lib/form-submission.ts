import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";

class FormSubmissionError extends Schema.TaggedErrorClass<FormSubmissionError>()(
  "FormSubmissionError",
  { cause: Schema.Defect() }
) {}

/** Bridges a promise mutation into Effect Form and reports a localized failure toast. */
export const formSubmission = <A>(promise: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => new FormSubmissionError({ cause }),
    try: promise,
  }).pipe(
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Effect.tapError requires a callback.
    Effect.tapError((error) =>
      Effect.sync(() => toast.error(getErrorMessage(error.cause)))
    )
  );
