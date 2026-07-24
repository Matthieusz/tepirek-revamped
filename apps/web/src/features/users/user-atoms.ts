import { Effect } from "effect";
import type * as Atom from "effect/unstable/reactivity/Atom";

import { asUserId } from "@/lib/branded-ids";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

/** Resource atom for the authenticated better-auth session. */
export const sessionAtom = appHttpApiAtom(
  Effect.gen(function* getSessionEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.user.getSession({});
  })
);

/** Resource atom for verified users selectable by event flows. */
export const verifiedUsersAtom = appHttpApiAtom(
  Effect.gen(function* getVerifiedUsersEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.user.getVerified({});
  })
);

/** Resource atom for all users. */
export const usersAtom = appHttpApiAtom(
  Effect.gen(function* listUsersEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.user.list({});
  })
);

/** Mutation atom for updating the current user's profile. */
export const updateProfileAtom = appHttpApiFn(
  Effect.fn("Web.User.updateProfile")(function* updateProfileEffect(
    payload: { readonly name: string },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const profile = yield* client.user.updateProfile({ payload });
    get.refresh(sessionAtom);
    get.refresh(usersAtom);
    get.refresh(verifiedUsersAtom);
    return profile;
  })
);

export const setVerifiedAtom = appHttpApiFn(
  Effect.fn("Web.User.setVerified")(function* setVerifiedEffect(
    payload: { readonly userId: string; readonly verified: boolean },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const user = yield* client.user.setVerified({
      payload: { ...payload, userId: yield* asUserId(payload.userId) },
    });
    get.refresh(usersAtom);
    get.refresh(verifiedUsersAtom);
    return user;
  })
);

export const setRoleAtom = appHttpApiFn(
  Effect.fn("Web.User.setRole")(function* setRoleEffect(
    payload: { readonly role: "admin" | "user"; readonly userId: string },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const user = yield* client.user.setRole({
      payload: { ...payload, userId: yield* asUserId(payload.userId) },
    });
    get.refresh(usersAtom);
    get.refresh(verifiedUsersAtom);
    return user;
  })
);

export const updateUserNameAtom = appHttpApiFn(
  Effect.fn("Web.User.updateName")(function* updateUserNameEffect(
    payload: { readonly name: string; readonly userId: string },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const user = yield* client.user.updateUserName({
      payload: { ...payload, userId: yield* asUserId(payload.userId) },
    });
    get.refresh(usersAtom);
    get.refresh(verifiedUsersAtom);
    return user;
  })
);

export const deleteUserAtom = appHttpApiFn(
  Effect.fn("Web.User.delete")(function* deleteUserEffect(
    payload: { readonly userId: string },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const user = yield* client.user.deleteUser({
      payload: { userId: yield* asUserId(payload.userId) },
    });
    get.refresh(usersAtom);
    get.refresh(verifiedUsersAtom);
    return user;
  })
);

const verifyDiscordGuildMembershipRequest = Effect.fn(
  "Web.User.verifyDiscordGuildMembership"
)(function* verifyDiscordGuildMembershipEffect(
  _: unknown,
  get: Atom.FnContext
) {
  const client = yield* AppHttpApiClient;
  const session = yield* client.user.verifyDiscordGuildMembership({});
  get.refresh(sessionAtom);
  return session;
});

export const verifyDiscordGuildMembershipAtom = appHttpApiFn((payload, get) =>
  verifyDiscordGuildMembershipRequest(payload, get)
);
