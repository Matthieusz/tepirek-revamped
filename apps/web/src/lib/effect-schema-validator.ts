import * as Schema from "effect/Schema";

/** Builds a TanStack Form validator from an Effect Schema. */
export const effectSchemaValidator =
  (
    schema: Schema.ConstraintDecoder<unknown, never>
  ): ((input: { readonly value: unknown }) => string | undefined) =>
  ({ value }) => {
    let errorMessage: string | undefined;
    try {
      Schema.decodeUnknownSync(schema)(value);
    } catch {
      errorMessage = "Nieprawidłowe dane formularza";
    }
    return errorMessage;
  };

/** Converts TanStack Form validation errors to renderable text. */
export const formErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Nieprawidłowa wartość";
};
