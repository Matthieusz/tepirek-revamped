import { toast } from "sonner";

interface AuthProviderError {
  readonly error: {
    readonly message?: string;
    readonly statusText?: string;
  };
}

/** Returns the provider's safest available message for an auth failure. */
export const getAuthProviderErrorMessage = (error: AuthProviderError): string =>
  error.error.message ||
  error.error.statusText ||
  "Nie udało się uwierzytelnić";

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
