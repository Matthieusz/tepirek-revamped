import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

type AuthOperation = "login" | "signup";

interface AuthProviderErrorDetails {
  readonly code?: string;
  readonly message?: string;
  readonly status?: number;
  readonly statusText?: string;
}

interface AuthResponse {
  readonly error: AuthProviderErrorDetails | null;
}

export class AuthFormSubmissionError extends Schema.TaggedErrorClass<AuthFormSubmissionError>()(
  "AuthFormSubmissionError",
  {
    cause: Schema.optional(Schema.Defect()),
    code: Schema.optional(Schema.String),
    kind: Schema.Literals(["provider", "request"]),
    message: Schema.String,
    operation: Schema.Literals(["login", "signup"]),
    status: Schema.optional(Schema.Finite),
  }
) {}

/** Returns the provider's safest available message for an auth failure. */
export const getAuthProviderErrorMessage = (
  error: AuthProviderErrorDetails
): string => {
  const message = error.message?.trim();
  if (message !== undefined && message.length > 0) {
    return message;
  }

  const statusText = error.statusText?.trim();
  if (statusText !== undefined && statusText.length > 0) {
    return statusText;
  }

  return "Nie udało się uwierzytelnić";
};

/** The result of an authentication mutation that is safe to render in a form. */
export type AuthFormSubmissionResult =
  | { readonly _tag: "success" }
  | { readonly _tag: "failure"; readonly error: AuthFormSubmissionError };

/**
 * Translates an auth client's response and rejected promise into one typed
 * form failure. The form owns displaying this failure, so provider callbacks
 * are deliberately not used for user-facing error messages.
 */
export const authFormSubmission = <Response extends AuthResponse>(
  operation: AuthOperation,
  request: () => Promise<Response>
): Effect.Effect<void, AuthFormSubmissionError> =>
  Effect.tryPromise({
    catch: (cause) => {
      if (!(cause instanceof Error)) {
        throw cause;
      }

      return new AuthFormSubmissionError({
        cause,
        kind: "request",
        message: "Nie udało się połączyć z usługą uwierzytelniania",
        operation,
      });
    },
    try: request,
  }).pipe(
    Effect.flatMap((response) => {
      if (response.error === null) {
        return Effect.void;
      }

      return Effect.fail(
        new AuthFormSubmissionError({
          code: response.error.code ?? undefined,
          kind: "provider",
          message: getAuthProviderErrorMessage(response.error),
          operation,
          status: response.error.status ?? 0,
        })
      );
    })
  );

/** Runs an authentication mutation and keeps expected failures out of component throws. */
export const runAuthFormSubmission = async <Response extends AuthResponse>(
  operation: AuthOperation,
  request: () => Promise<Response>
): Promise<AuthFormSubmissionResult> => {
  try {
    await Effect.runPromise(authFormSubmission(operation, request));
    return { _tag: "success" };
  } catch (error: unknown) {
    if (Schema.is(AuthFormSubmissionError)(error)) {
      return { _tag: "failure", error };
    }

    throw error;
  }
};

/** Preserves the login success order: feedback, invalidate, then navigate. */
export const handleLoginSuccess = async (actions: {
  readonly invalidate: () => Promise<void>;
  readonly navigate: () => Promise<void>;
  readonly notifySuccess: (message: string) => void;
}): Promise<void> => {
  actions.notifySuccess("Zalogowano pomyślnie");
  await actions.invalidate();
  await actions.navigate();
};

/** Preserves the signup success order: navigate first, then announce success. */
export const handleSignupSuccess = async (actions: {
  readonly navigate: () => Promise<void>;
  readonly notifySuccess: (message: string) => void;
}): Promise<void> => {
  await actions.navigate();
  actions.notifySuccess("Zarejestrowano pomyślnie");
};
