/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import { USER_ROLES } from "@tepirek-revamped/config";
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import * as Schema from "effect/Schema";

import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";

export const Role = Schema.Literals(USER_ROLES);

export const Name = Schema.NonEmptyString.check(Schema.isMinLength(2));

export const DeleteUserPayload = Schema.Struct({ userId: AppUserId });

export interface DeleteUserPayload extends Schema.Schema.Type<
  typeof DeleteUserPayload
> {}

export const SetRolePayload = Schema.Struct({ role: Role, userId: AppUserId });

export interface SetRolePayload extends Schema.Schema.Type<
  typeof SetRolePayload
> {}

export const SetVerifiedPayload = Schema.Struct({
  userId: AppUserId,
  verified: Schema.Boolean,
});

export interface SetVerifiedPayload extends Schema.Schema.Type<
  typeof SetVerifiedPayload
> {}

export const UpdateProfilePayload = Schema.Struct({ name: Name });

export interface UpdateProfilePayload extends Schema.Schema.Type<
  typeof UpdateProfilePayload
> {}

export const UpdateUserNamePayload = Schema.Struct({
  name: Name,
  userId: AppUserId,
});

export interface UpdateUserNamePayload extends Schema.Schema.Type<
  typeof UpdateUserNamePayload
> {}

export const MutationSuccess = Schema.Struct({ success: Schema.Literal(true) });

export interface MutationSuccess extends Schema.Schema.Type<
  typeof MutationSuccess
> {}

export const VerifiedMember = Schema.Struct({
  id: AppUserId,
  image: Schema.NullOr(Schema.String),
  name: Schema.String,
});

export interface VerifiedMember extends Schema.Schema.Type<
  typeof VerifiedMember
> {}

export const Player = Schema.Struct({
  createdAt: Schema.DateFromString,
  id: AppUserId,
  image: Schema.NullOr(Schema.String),
  name: Schema.String,
  role: Schema.NullOr(Schema.String),
  updatedAt: Schema.DateFromString,
  verified: Schema.Boolean,
});

export interface Player extends Schema.Schema.Type<typeof Player> {}

export const MutatedUser = Schema.NullOr(Player);

export const DiscordMembershipResult = Schema.Struct({ valid: Schema.Boolean });

export interface DiscordMembershipResult extends Schema.Schema.Type<
  typeof DiscordMembershipResult
> {}

export const Session = Schema.Struct({
  createdAt: Schema.DateFromString,
  expiresAt: Schema.DateFromString,
  id: Schema.NonEmptyString,
  ipAddress: Schema.optionalKey(Schema.NullOr(Schema.String)),
  updatedAt: Schema.DateFromString,
  userAgent: Schema.optionalKey(Schema.NullOr(Schema.String)),
  userId: AppUserId,
});

export interface Session extends Schema.Schema.Type<typeof Session> {}

export const AuthenticatedSession = Schema.Struct({
  session: Session,
  user: Schema.Struct({
    createdAt: Schema.DateFromString,
    email: Schema.String,
    emailVerified: Schema.Boolean,
    id: AppUserId,
    image: Schema.optionalKey(Schema.NullOr(Schema.String)),
    name: Schema.String,
    role: Schema.optionalKey(Schema.NullOr(Schema.String)),
    updatedAt: Schema.DateFromString,
    verified: Schema.Boolean,
  }),
});

export interface AuthenticatedSession extends Schema.Schema.Type<
  typeof AuthenticatedSession
> {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class UserUnauthorized extends Schema.TaggedError<UserUnauthorized>()(
  "UserUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class UserForbidden extends Schema.TaggedError<UserForbidden>()(
  "UserForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class UserBadRequest extends Schema.TaggedError<UserBadRequest>()(
  "UserBadRequest",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class UserPersistenceUnavailable extends Schema.TaggedError<UserPersistenceUnavailable>()(
  "UserPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const UserError = Schema.Union([
  UserUnauthorized,
  UserForbidden,
  UserBadRequest,
  UserNotFound,
  UserPersistenceUnavailable,
]);

export const UserHttpApiGroup = HttpApiGroup.make("user")
  .add(
    HttpApiEndpoint.post("deleteUser", "/delete", {
      error: UserError,
      payload: DeleteUserPayload,
      success: MutationSuccess,
    }),
    HttpApiEndpoint.get("getSession", "/session", {
      error: UserError,
      success: AuthenticatedSession,
    }),
    HttpApiEndpoint.get("getVerified", "/verified", {
      error: UserError,
      success: Schema.Array(VerifiedMember),
    }),
    HttpApiEndpoint.get("list", "/", {
      error: UserError,
      success: Schema.Array(Player),
    }),
    HttpApiEndpoint.post("setRole", "/set-role", {
      error: UserError,
      payload: SetRolePayload,
      success: MutatedUser,
    }),
    HttpApiEndpoint.post("setVerified", "/set-verified", {
      error: UserError,
      payload: SetVerifiedPayload,
      success: MutatedUser,
    }),
    HttpApiEndpoint.post("updateProfile", "/profile", {
      error: UserError,
      payload: UpdateProfilePayload,
      success: MutatedUser,
    }),
    HttpApiEndpoint.post("updateUserName", "/name", {
      error: UserError,
      payload: UpdateUserNamePayload,
      success: MutatedUser,
    }),
    HttpApiEndpoint.post(
      "verifyDiscordGuildMembership",
      "/verify-discord-guild-membership",
      { error: UserError, success: DiscordMembershipResult }
    )
  )
  .prefix("/user");
