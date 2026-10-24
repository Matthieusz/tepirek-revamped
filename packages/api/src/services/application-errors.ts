/* eslint-disable max-classes-per-file -- The application error algebra is one closed contract. */
import * as Schema from "effect/Schema";

/** A caller supplied value violates an application invariant. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ApplicationInvalidInput extends Schema.TaggedError<
  ApplicationInvalidInput,
  { readonly brand: unique symbol }
>()("ApplicationInvalidInput", { message: Schema.String }) {}

/** The caller is authenticated but cannot perform the operation. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ApplicationForbidden extends Schema.TaggedError<
  ApplicationForbidden,
  { readonly brand: unique symbol }
>()("ApplicationForbidden", { message: Schema.String }) {}

/** A required application resource does not exist. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ApplicationNotFound extends Schema.TaggedError<
  ApplicationNotFound,
  { readonly brand: unique symbol }
>()("ApplicationNotFound", { message: Schema.String }) {}

/** The requested state transition conflicts with current application state. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ApplicationConflict extends Schema.TaggedError<
  ApplicationConflict,
  { readonly brand: unique symbol }
>()("ApplicationConflict", { message: Schema.String }) {}

/** An application dependency could not complete an operation. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class ApplicationDependencyUnavailable extends Schema.TaggedError<
  ApplicationDependencyUnavailable,
  { readonly brand: unique symbol }
>()("ApplicationDependencyUnavailable", {
  cause: Schema.Defect(),
  operation: Schema.String,
}) {}
