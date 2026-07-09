/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import { USER_ROLES } from "@tepirek-revamped/config";
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

export const UserId = Schema.NonEmptyString;
export const Role = Schema.Literals(USER_ROLES);
export const Name = Schema.NonEmptyString.check(Schema.isMinLength(2));

export const DeleteUserPayload = Schema.Struct({ userId: UserId });
export const SetRolePayload = Schema.Struct({ role: Role, userId: UserId });
export const SetVerifiedPayload = Schema.Struct({
  userId: UserId,
  verified: Schema.Boolean,
});
export const UpdateProfilePayload = Schema.Struct({ name: Name });
export const UpdateUserNamePayload = Schema.Struct({
  name: Name,
  userId: UserId,
});
export const MutationSuccess = Schema.Struct({ success: Schema.Literal(true) });
export const VerifiedMember = Schema.Struct({
  id: UserId,
  image: Schema.NullOr(Schema.String),
  name: Schema.String,
});
export const Player = Schema.Struct({
  createdAt: Schema.DateFromString,
  id: UserId,
  image: Schema.NullOr(Schema.String),
  name: Schema.String,
  role: Schema.NullOr(Schema.String),
  updatedAt: Schema.DateFromString,
  verified: Schema.Boolean,
});
export const MutatedUser = Schema.NullOr(Player);
export const DiscordMembershipResult = Schema.Struct({ valid: Schema.Boolean });
export const Session = Schema.Struct({
  createdAt: Schema.DateFromString,
  expiresAt: Schema.DateFromString,
  id: Schema.NonEmptyString,
  ipAddress: Schema.optional(Schema.NullOr(Schema.String)),
  token: Schema.NonEmptyString,
  updatedAt: Schema.DateFromString,
  userAgent: Schema.optional(Schema.NullOr(Schema.String)),
  userId: UserId,
});
export const AuthenticatedSession = Schema.Struct({
  session: Session,
  user: Schema.Struct({
    createdAt: Schema.DateFromString,
    email: Schema.String,
    emailVerified: Schema.Boolean,
    id: UserId,
    image: Schema.optional(Schema.NullOr(Schema.String)),
    name: Schema.String,
    role: Schema.optional(Schema.NullOr(Schema.String)),
    updatedAt: Schema.DateFromString,
    verified: Schema.Boolean,
  }),
});

export class UserUnauthorized extends Schema.TaggedErrorClass<UserUnauthorized>()(
  "UserUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}
export class UserForbidden extends Schema.TaggedErrorClass<UserForbidden>()(
  "UserForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}
export class UserBadRequest extends Schema.TaggedErrorClass<UserBadRequest>()(
  "UserBadRequest",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}
export class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()(
  "UserNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}
export class UserPersistenceUnavailable extends Schema.TaggedErrorClass<UserPersistenceUnavailable>()(
  "UserPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String },
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
