import * as Schema from "effect/Schema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/** Shared email validation used by the login and signup forms. */
export const EmailSchema = Schema.String.pipe(
  Schema.refine((value): value is string => EMAIL_PATTERN.test(value), {
    message: "Nieprawidłowy adres e-mail",
  })
);

/** Shared password validation used by the login and signup forms. */
export const PasswordSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.length >= 8, {
    message: "Hasło musi mieć co najmniej 8 znaków",
  })
);

/** Validates the display name collected by the signup form. */
export const SignupNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.length >= 2, {
    message: "Nazwa musi mieć co najmniej 2 znaki",
  })
);
