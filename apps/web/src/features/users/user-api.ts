import type {
  AuthenticatedSession,
  Player,
  SetRolePayload,
  SetVerifiedPayload,
  UpdateProfilePayload,
  UpdateUserNamePayload,
  VerifiedMember,
} from "@tepirek-revamped/api/protocol/user/http-api-contract";
import { Effect } from "effect";

import { asAppUserId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Fetches the authenticated session from the application API. */
export const getSession = Effect.fn("Web.User.getSession")(
  function* getSessionEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.user.getSession({});
  }
);

/** Lists users visible to an authenticated administrator. */
export const listUsers = Effect.fn("Web.User.list")(
  function* listUsersEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.user.list({});
  }
);

/** Lists verified users available to event workflows. */
export const getVerifiedUsers = Effect.fn("Web.User.getVerified")(
  function* getVerifiedUsersEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.user.getVerified({});
  }
);

/** Updates the current user's profile. */
export const updateProfile = Effect.fn("Web.User.updateProfile")(
  function* updateProfileEffect(payload: UpdateProfilePayload) {
    const client = yield* AppHttpApiClient;
    return yield* client.user.updateProfile({ payload });
  }
);

/** Changes a user's verification status after decoding the browser-provided ID. */
export const setVerified = Effect.fn("Web.User.setVerified")(
  function* setVerifiedEffect(payload: SetVerifiedPayload) {
    const client = yield* AppHttpApiClient;
    return yield* client.user.setVerified({
      payload: {
        userId: yield* asAppUserId(payload.userId),
        verified: payload.verified,
      },
    });
  }
);

/** Changes a user's role after decoding the browser-provided ID. */
export const setRole = Effect.fn("Web.User.setRole")(function* setRoleEffect(
  payload: SetRolePayload
) {
  const client = yield* AppHttpApiClient;
  return yield* client.user.setRole({
    payload: {
      role: payload.role,
      userId: yield* asAppUserId(payload.userId),
    },
  });
});

/** Changes a user's name after decoding the browser-provided ID. */
export const updateUserName = Effect.fn("Web.User.updateName")(
  function* updateUserNameEffect(payload: UpdateUserNamePayload) {
    const client = yield* AppHttpApiClient;
    return yield* client.user.updateUserName({
      payload: {
        name: payload.name,
        userId: yield* asAppUserId(payload.userId),
      },
    });
  }
);

/** Deletes a user after decoding the browser-provided ID. */
export const deleteUser = Effect.fn("Web.User.delete")(
  function* deleteUserEffect(userId: string) {
    const client = yield* AppHttpApiClient;
    return yield* client.user.deleteUser({
      payload: { userId: yield* asAppUserId(userId) },
    });
  }
);

/** Rechecks the current user's Discord guild membership. */
export const verifyDiscordGuildMembership = Effect.fn(
  "Web.User.verifyDiscordGuildMembership"
)(function* verifyDiscordGuildMembershipEffect() {
  const client = yield* AppHttpApiClient;
  return yield* client.user.verifyDiscordGuildMembership({});
});

/** Promise runner used by user query and mutation adapters. */
export type UserApiRunner = typeof runAppHttpApi;

/** User session returned by the application API. */
export type UserSession = AuthenticatedSession;

/** User record returned by the administrator list endpoint. */
export type UserListItem = Player;

/** Verified user returned by event member selectors. */
export type VerifiedUser = VerifiedMember;
