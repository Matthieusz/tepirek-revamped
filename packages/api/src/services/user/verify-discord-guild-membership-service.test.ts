import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../../domain/squad-builder/app-user-id.ts";
import { DiscordGuildVerifier } from "./discord-guild-verifier.ts";
import { UserStore } from "./user-store.ts";
import { verifyDiscordGuildMembership } from "./verify-discord-guild-membership-service.ts";

const FIXED_TIME = new Date("2026-02-20T12:00:00.000Z");

const unexpectedCall = () => Effect.die(new Error("Unexpected UserStore call"));

const makeLayer = (
  valid: boolean,
  markUserVerified: typeof UserStore.Service.markUserVerified
) => {
  const store = UserStore.of({
    deleteUser: unexpectedCall,
    getDiscordAccessToken: () => Effect.succeed(Redacted.make("access-token")),
    getVerified: unexpectedCall,
    list: unexpectedCall,
    markUserVerified,
    setRole: unexpectedCall,
    setVerified: unexpectedCall,
    updateProfile: unexpectedCall,
  });
  const verifier = DiscordGuildVerifier.of({
    verifyMembership: () => Effect.succeed(valid),
  });
  return Layer.merge(
    Layer.succeed(UserStore, store),
    Layer.succeed(DiscordGuildVerifier, verifier)
  );
};

it.effect("marks a Discord guild member as verified at the current time", () =>
  Effect.gen(function* verifyDiscordGuildMember() {
    const userId = yield* parseAppUserId("discord-member");
    const markedUsers = yield* Ref.make<
      readonly { readonly updatedAt: Date; readonly userId: typeof userId }[]
    >([]);
    const layer = makeLayer(true, (input) => Ref.set(markedUsers, [input]));

    yield* TestClock.setTime(FIXED_TIME.getTime());
    const result = yield* verifyDiscordGuildMembership({ userId }).pipe(
      Effect.provide(layer)
    );

    expect(result).toEqual({ valid: true });
    expect(yield* Ref.get(markedUsers)).toEqual([
      {
        updatedAt: FIXED_TIME,
        userId,
      },
    ]);
  })
);

it.effect("does not mutate verification state for a non-member", () =>
  Effect.gen(function* rejectDiscordGuildNonMember() {
    const userId = yield* parseAppUserId("discord-non-member");
    const markCount = yield* Ref.make(0);
    const layer = makeLayer(false, () =>
      Ref.update(markCount, (count) => count + 1)
    );

    const result = yield* verifyDiscordGuildMembership({ userId }).pipe(
      Effect.provide(layer)
    );

    expect(result).toEqual({ valid: false });
    expect(yield* Ref.get(markCount)).toBe(0);
  })
);
