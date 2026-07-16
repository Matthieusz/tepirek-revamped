import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { toast } from "sonner";

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

class AuthFormSubmissionError extends Schema.TaggedErrorClass<AuthFormSubmissionError>()(
  "AuthFormSubmissionError",
  {
    cause: Schema.optional(Schema.Defect()),
    code: Schema.optional(Schema.String),
    kind: Schema.Literals(["provider", "request"]),
    message: Schema.String,
    operation: Schema.Literals(["login", "signup"]),
    status: Schema.optional(Schema.Number),
  }
) {}

/** Returns the provider's safest available message for an auth failure. */
export const getAuthProviderErrorMessage = (
  error: AuthProviderErrorDetails
): string =>
  error.message?.trim() ||
  error.statusText?.trim() ||
  "Nie udało się uwierzytelnić";

/** Prevents a form action from starting while its previous request is waiting. */
export const submitWhenIdle = <A>(
  waiting: boolean,
  submit: () => A
): A | undefined => {
  if (waiting) {
    return undefined;
  }

  return submit();
};

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
    catch: (cause) =>
      new AuthFormSubmissionError({
        cause,
        kind: "request",
        message: "Nie udało się połączyć z usługą uwierzytelniania",
        operation,
      }),
    try: request,
  }).pipe(
    Effect.flatMap((response) => {
      if (response.error === null) {
        return Effect.void;
      }

      return Effect.fail(
        new AuthFormSubmissionError({
          ...(response.error.code ? { code: response.error.code } : {}),
          kind: "provider",
          message: getAuthProviderErrorMessage(response.error),
          operation,
          status: response.error.status ?? 0,
        })
      );
    })
  );

/** Preserves the login success order: feedback, invalidate, then navigate. */
export const handleLoginSuccess = async (actions: {
  readonly invalidate: () => Promise<unknown>;
  readonly navigate: () => Promise<unknown>;
}): Promise<void> => {
  toast.success("Zalogowano pomyślnie");
  await actions.invalidate();
  await actions.navigate();
};

/** Preserves the signup success order: navigate first, then announce success. */
export const handleSignupSuccess = async (
  navigate: () => Promise<unknown>
): Promise<void> => {
  await navigate();
  toast.success("Zarejestrowano pomyślnie");
};
