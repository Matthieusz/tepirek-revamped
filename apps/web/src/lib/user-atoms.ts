import { Effect } from "effect";

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
  (payload: { readonly name: string }, get) =>
    Effect.gen(function* updateProfileEffect() {
      const client = yield* AppHttpApiClient;
      const profile = yield* client.user.updateProfile({ payload });
      get.refresh(sessionAtom);
      get.refresh(usersAtom);
      get.refresh(verifiedUsersAtom);
      return profile;
    })
);

export const setVerifiedAtom = appHttpApiFn(
  (payload: { readonly userId: string; readonly verified: boolean }, get) =>
    Effect.gen(function* setVerifiedEffect() {
      const client = yield* AppHttpApiClient;
      const user = yield* client.user.setVerified({ payload });
      get.refresh(usersAtom);
      get.refresh(verifiedUsersAtom);
      return user;
    })
);

export const setRoleAtom = appHttpApiFn(
  (
    payload: { readonly role: "admin" | "user"; readonly userId: string },
    get
  ) =>
    Effect.gen(function* setRoleEffect() {
      const client = yield* AppHttpApiClient;
      const user = yield* client.user.setRole({ payload });
      get.refresh(usersAtom);
      get.refresh(verifiedUsersAtom);
      return user;
    })
);

export const updateUserNameAtom = appHttpApiFn(
  (payload: { readonly name: string; readonly userId: string }, get) =>
    Effect.gen(function* updateUserNameEffect() {
      const client = yield* AppHttpApiClient;
      const user = yield* client.user.updateUserName({ payload });
      get.refresh(usersAtom);
      get.refresh(verifiedUsersAtom);
      return user;
    })
);

export const deleteUserAtom = appHttpApiFn(
  (payload: { readonly userId: string }, get) =>
    Effect.gen(function* deleteUserEffect() {
      const client = yield* AppHttpApiClient;
      const user = yield* client.user.deleteUser({ payload });
      get.refresh(usersAtom);
      get.refresh(verifiedUsersAtom);
      return user;
    })
);

export const verifyDiscordGuildMembershipAtom = appHttpApiFn((_, get) =>
  Effect.gen(function* verifyDiscordGuildMembershipEffect() {
    const client = yield* AppHttpApiClient;
    const session = yield* client.user.verifyDiscordGuildMembership({});
    get.refresh(sessionAtom);
    return session;
  })
);
