/* eslint-disable promise/prefer-await-to-callbacks -- Effect Match handlers are synchronous pattern handlers, not Promise callbacks. */
/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { RequestSession } from "../../protocol/auth/current-session.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  UserBadRequest,
  UserForbidden,
  UserNotFound,
  UserPersistenceUnavailable,
  UserUnauthorized,
} from "../../protocol/user/http-api-contract.ts";
import type {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationForbidden,
  ApplicationInvalidInput,
  ApplicationNotFound,
} from "../../services/application-errors.ts";
import {
  deleteUser,
  getVerifiedUsers,
  listUsers,
  setRole,
  setVerified,
  updateProfile,
  verifyDiscordGuildMembership,
} from "../../services/user/user-service.ts";
import { buildAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireSession, requireVerifiedSession } =
  buildAuthorizationPolicy({
    forbidden: () => new UserForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new UserUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new UserForbidden({ message: "Konto oczekuje na weryfikację" }),
  });

const mapUserError = (
  input:
    | ApplicationConflict
    | ApplicationDependencyUnavailable
    | ApplicationForbidden
    | ApplicationInvalidInput
    | ApplicationNotFound
) =>
  Match.value(input).pipe(
    Match.tag(
      "ApplicationConflict",
      "ApplicationInvalidInput",
      (error) => new UserBadRequest({ message: error.message })
    ),
    Match.tag(
      "ApplicationForbidden",
      (error) => new UserForbidden({ message: error.message })
    ),
    Match.tag(
      "ApplicationNotFound",
      (error) => new UserNotFound({ message: error.message })
    ),
    Match.tag(
      "ApplicationDependencyUnavailable",
      (error) => new UserPersistenceUnavailable({ operation: error.operation })
    ),
    Match.exhaustive
  );

type ProjectedSession = Omit<
  RequestSession["session"],
  "ipAddress" | "token" | "userAgent"
> & {
  ipAddress?: Exclude<RequestSession["session"]["ipAddress"], undefined>;
  userAgent?: Exclude<RequestSession["session"]["userAgent"], undefined>;
};

type ProjectedUser = Omit<RequestSession["user"], "image" | "role"> & {
  image?: Exclude<RequestSession["user"]["image"], undefined>;
  role?: Exclude<RequestSession["user"]["role"], undefined>;
};

/** Projects an authenticated vendor session without manufacturing optional fields. */
export const projectAuthenticatedSession = (requestSession: RequestSession) => {
  const {
    ipAddress,
    token: _token,
    userAgent,
    ...session
  } = requestSession.session;

  const { image, role, ...user } = requestSession.user;
  const projectedSession: ProjectedSession = { ...session };
  const projectedUser: ProjectedUser = { ...user };

  if (ipAddress !== undefined) {
    projectedSession.ipAddress = ipAddress;
  }

  if (userAgent !== undefined) {
    projectedSession.userAgent = userAgent;
  }

  if (image !== undefined) {
    projectedUser.image = image;
  }

  if (role !== undefined) {
    projectedUser.role = role;
  }

  return { session: projectedSession, user: projectedUser };
};

export const UserHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "user",
  (handlers) =>
    handlers
      .handle("deleteUser", ({ payload }) =>
        Effect.gen(function* deleteUserHandler() {
          yield* requireAdminSession();

          return yield* deleteUser({ userId: payload.userId }).pipe(
            Effect.mapError(mapUserError)
          );
        })
      )
      .handle("getSession", () =>
        requireSession().pipe(Effect.map(projectAuthenticatedSession))
      )
      .handle("getVerified", () =>
        Effect.gen(function* getVerifiedHandler() {
          yield* requireVerifiedSession();

          return yield* getVerifiedUsers().pipe(Effect.mapError(mapUserError));
        })
      )
      .handle("list", () =>
        Effect.gen(function* listUsersHandler() {
          yield* requireVerifiedSession();

          return yield* listUsers().pipe(Effect.mapError(mapUserError));
        })
      )
      .handle("setRole", ({ payload }) =>
        Effect.gen(function* setRoleHandler() {
          const session = yield* requireAdminSession();

          return yield* setRole({
            actorId: session.user.id,
            role: payload.role,
            userId: payload.userId,
          }).pipe(Effect.mapError(mapUserError));
        })
      )
      .handle("setVerified", ({ payload }) =>
        Effect.gen(function* setVerifiedHandler() {
          const session = yield* requireAdminSession();

          return yield* setVerified({
            actorId: session.user.id,
            userId: payload.userId,
            verified: payload.verified,
          }).pipe(Effect.mapError(mapUserError));
        })
      )
      .handle("updateProfile", ({ payload }) =>
        Effect.gen(function* updateProfileHandler() {
          const session = yield* requireVerifiedSession();

          return yield* updateProfile({
            name: payload.name,
            userId: session.user.id,
          }).pipe(Effect.mapError(mapUserError));
        })
      )
      .handle("updateUserName", ({ payload }) =>
        Effect.gen(function* updateUserNameHandler() {
          yield* requireAdminSession();

          return yield* updateProfile({
            name: payload.name,
            userId: payload.userId,
          }).pipe(Effect.mapError(mapUserError));
        })
      )
      .handle("verifyDiscordGuildMembership", () =>
        Effect.gen(function* verifyDiscordGuildMembershipHandler() {
          const session = yield* requireSession();

          return yield* verifyDiscordGuildMembership({
            userId: session.user.id,
          }).pipe(Effect.mapError(mapUserError));
        })
      )
);
