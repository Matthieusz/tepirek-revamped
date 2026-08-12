/* eslint-disable max-classes-per-file -- The application error algebra is one closed contract. */
import * as Schema from "effect/Schema";

/** A caller supplied value violates an application invariant. */
export class ApplicationInvalidInput extends Schema.TaggedErrorClass<ApplicationInvalidInput>()(
  "ApplicationInvalidInput",
  { message: Schema.String }
) {}

/** The caller is authenticated but cannot perform the operation. */
export class ApplicationForbidden extends Schema.TaggedErrorClass<ApplicationForbidden>()(
  "ApplicationForbidden",
  { message: Schema.String }
) {}

/** A required application resource does not exist. */
export class ApplicationNotFound extends Schema.TaggedErrorClass<ApplicationNotFound>()(
  "ApplicationNotFound",
  { message: Schema.String }
) {}

/** The requested state transition conflicts with current application state. */
export class ApplicationConflict extends Schema.TaggedErrorClass<ApplicationConflict>()(
  "ApplicationConflict",
  { message: Schema.String }
) {}

/** An application dependency could not complete an operation. */
export class ApplicationDependencyUnavailable extends Schema.TaggedErrorClass<ApplicationDependencyUnavailable>()(
  "ApplicationDependencyUnavailable",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

export type ApplicationError =
  | ApplicationInvalidInput
  | ApplicationForbidden
  | ApplicationNotFound
  | ApplicationConflict
  | ApplicationDependencyUnavailable;
