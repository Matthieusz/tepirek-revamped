import { UserId } from "@tepirek-revamped/api/protocol/user/http-api-contract";
import { Effect } from "effect";
import type * as Atom from "effect/unstable/reactivity/Atom";

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
  Effect.fnUntraced(function* updateProfileEffect(
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
  Effect.fnUntraced(function* setVerifiedEffect(
    payload: { readonly userId: string; readonly verified: boolean },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const user = yield* client.user.setVerified({
      payload: { ...payload, userId: UserId.make(payload.userId) },
    });
    get.refresh(usersAtom);
    get.refresh(verifiedUsersAtom);
    return user;
  })
);

export const setRoleAtom = appHttpApiFn(
  Effect.fnUntraced(function* setRoleEffect(
    payload: { readonly role: "admin" | "user"; readonly userId: string },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const user = yield* client.user.setRole({
      payload: { ...payload, userId: UserId.make(payload.userId) },
    });
    get.refresh(usersAtom);
    get.refresh(verifiedUsersAtom);
    return user;
  })
);

export const updateUserNameAtom = appHttpApiFn(
  Effect.fnUntraced(function* updateUserNameEffect(
    payload: { readonly name: string; readonly userId: string },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const user = yield* client.user.updateUserName({
      payload: { ...payload, userId: UserId.make(payload.userId) },
    });
    get.refresh(usersAtom);
    get.refresh(verifiedUsersAtom);
    return user;
  })
);

export const deleteUserAtom = appHttpApiFn(
  Effect.fnUntraced(function* deleteUserEffect(
    payload: { readonly userId: string },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const user = yield* client.user.deleteUser({
      payload: { userId: UserId.make(payload.userId) },
    });
    get.refresh(usersAtom);
    get.refresh(verifiedUsersAtom);
    return user;
  })
);

const verifyDiscordGuildMembershipRequest = Effect.fnUntraced(
  function* verifyDiscordGuildMembershipEffect(
    _: unknown,
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const session = yield* client.user.verifyDiscordGuildMembership({});
    get.refresh(sessionAtom);
    return session;
  }
);

export const verifyDiscordGuildMembershipAtom = appHttpApiFn((payload, get) =>
  verifyDiscordGuildMembershipRequest(payload, get)
);
