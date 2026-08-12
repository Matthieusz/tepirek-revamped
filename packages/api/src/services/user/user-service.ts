import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import { DiscordGuildVerifier } from "./discord-guild-verifier.ts";
import { UserStore } from "./user-store.ts";

export const deleteUser = Effect.fn("User.delete")(function* deleteUser(input: {
  readonly userId: Parameters<(typeof UserStore.Service)["deleteUser"]>[0];
}) {
  const store = yield* UserStore;
  return yield* store.deleteUser(input.userId);
});

export const getVerifiedUsers = Effect.fn("User.getVerified")(
  function* getVerifiedUsers() {
    const store = yield* UserStore;
    return yield* store.getVerified();
  }
);

export const listUsers = Effect.fn("User.list")(function* listUsers() {
  const store = yield* UserStore;
  return yield* store.list();
});

export const setRole = Effect.fn("User.setRole")(function* setRole(
  input: Omit<Parameters<(typeof UserStore.Service)["setRole"]>[0], "updatedAt">
) {
  const store = yield* UserStore;
  return yield* store.setRole({
    ...input,
    updatedAt: yield* DateTime.nowAsDate,
  });
});

export const setVerified = Effect.fn("User.setVerified")(function* setVerified(
  input: Omit<
    Parameters<(typeof UserStore.Service)["setVerified"]>[0],
    "updatedAt"
  >
) {
  const store = yield* UserStore;
  return yield* store.setVerified({
    ...input,
    updatedAt: yield* DateTime.nowAsDate,
  });
});

export const updateProfile = Effect.fn("User.updateProfile")(
  function* updateProfile(
    input: Omit<
      Parameters<(typeof UserStore.Service)["updateProfile"]>[0],
      "updatedAt"
    >
  ) {
    const store = yield* UserStore;
    return yield* store.updateProfile({
      ...input,
      updatedAt: yield* DateTime.nowAsDate,
    });
  }
);

export const verifyDiscordGuildMembership = Effect.fn(
  "User.verifyDiscordGuildMembership"
)(function* verifyDiscordGuildMembership(input: {
  readonly userId: Parameters<
    (typeof UserStore.Service)["getDiscordAccessToken"]
  >[0];
}) {
  const store = yield* UserStore;
  const verifier = yield* DiscordGuildVerifier;
  const accessToken = yield* store.getDiscordAccessToken(input.userId);
  const valid = yield* verifier.verifyMembership(accessToken);

  if (valid) {
    yield* store.markUserVerified({
      updatedAt: yield* DateTime.nowAsDate,
      userId: input.userId,
    });
  }

  return { valid };
});
