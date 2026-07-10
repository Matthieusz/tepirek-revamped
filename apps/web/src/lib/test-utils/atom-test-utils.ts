import { setTimeout } from "node:timers/promises";

import type { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { Effect, Layer } from "effect";
import type { HttpApiClient } from "effect/unstable/httpapi";
import { AsyncResult, Atom, AtomRegistry } from "effect/unstable/reactivity";

import {
  AppHttpApiClient,
  appHttpApiRuntime,
} from "@/lib/http-api-client-runtime";

export interface ApiCall {
  readonly args: unknown;
  readonly group: string;
  readonly method: string;
}

export const makeTestLayer = () => {
  const calls: ApiCall[] = [];

  const record =
    (group: string, method: string) =>
    (args: { readonly payload: unknown }): Effect.Effect<unknown> => {
      calls.push({ args: args.payload, group, method });
      return Effect.void;
    };

  // Note: type is inferred from the object literal; the cast at Layer.succeed
  // bridges the gap to the full HttpApiClient.ForApi type.
  const client = {
    auction: {
      getAuctionSignups: record("auction", "getAuctionSignups"),
      getAuctionStats: record("auction", "getAuctionStats"),
      removeAuctionSignup: record("auction", "removeAuctionSignup"),
      toggleAuctionSignup: ({ payload }: { readonly payload: unknown }) => {
        calls.push({
          args: payload,
          group: "auction",
          method: "toggleAuctionSignup",
        });
        return Effect.succeed({ action: "added" as const });
      },
    },
    ranking: {
      getOldestUnpaidEvent: () => {
        calls.push({
          args: {},
          group: "ranking",
          method: "getOldestUnpaidEvent",
        });
        return Effect.succeed(null);
      },
    },
    skills: {
      createProfession: record("skills", "createProfession"),
      createRange: record("skills", "createRange"),
      createSkill: record("skills", "createSkill"),
      deleteRange: record("skills", "deleteRange"),
      deleteSkill: record("skills", "deleteSkill"),
      getRangeBySlug: ({ payload }: { readonly payload: unknown }) => {
        calls.push({
          args: payload,
          group: "skills",
          method: "getRangeBySlug",
        });
        return Effect.succeed({ id: 1, image: "", level: 1, name: "" });
      },
      listProfessions: () => {
        calls.push({ args: {}, group: "skills", method: "listProfessions" });
        return Effect.succeed([] as readonly unknown[]);
      },
      listRanges: () => {
        calls.push({ args: {}, group: "skills", method: "listRanges" });
        return Effect.succeed([] as readonly unknown[]);
      },
      listSkillsByRange: ({ payload }: { readonly payload: unknown }) => {
        calls.push({
          args: payload,
          group: "skills",
          method: "listSkillsByRange",
        });
        return Effect.succeed([] as readonly unknown[]);
      },
    },
    squadBuilderAccountImport: {
      confirmOwnedAccountImport: record(
        "squadBuilderAccountImport",
        "confirmOwnedAccountImport"
      ),
      listOwnedAccounts: () => {
        calls.push({
          args: {},
          group: "squadBuilderAccountImport",
          method: "listOwnedAccounts",
        });
        return Effect.succeed([] as readonly unknown[]);
      },
      previewMargonemProfileImport: () => Effect.succeed({}),
      previewOwnedAccountImports: () => Effect.succeed({}),
    },
    squadBuilderAccountRefetch: {
      applyAccountRefetch: record(
        "squadBuilderAccountRefetch",
        "applyAccountRefetch"
      ),
      previewAccountRefetch: () => Effect.succeed({}),
    },
    squadBuilderSquadGroup: {
      getSquadGroupDetail: record(
        "squadBuilderSquadGroup",
        "getSquadGroupDetail"
      ),
      listAvailableSquadCharacters: record(
        "squadBuilderSquadGroup",
        "listAvailableSquadCharacters"
      ),
      listOwnedSquadGroups: record(
        "squadBuilderSquadGroup",
        "listOwnedSquadGroups"
      ),
      saveSharedSquadGroupCharacters: record(
        "squadBuilderSquadGroup",
        "saveSharedSquadGroupCharacters"
      ),
      saveSquadGroup: record("squadBuilderSquadGroup", "saveSquadGroup"),
    },
    vault: {
      distributeGold: record("vault", "distributeGold"),
      getUserStats: ({ payload }: { readonly payload: unknown }) => {
        calls.push({ args: payload, group: "vault", method: "getUserStats" });
        return Effect.succeed([] as readonly unknown[]);
      },
      getVault: ({ payload }: { readonly payload: unknown }) => {
        calls.push({ args: payload, group: "vault", method: "getVault" });
        return Effect.succeed([] as readonly unknown[]);
      },
      togglePaidOut: record("vault", "togglePaidOut"),
    },
  };

  // SAFETY: The AppHttpApi.ForApi type is a complex generated contract type.
  // This cast is local to the test helper and bounded by the recording-adapter
  // seam; callers see only the typed ApiCall records.
  const layer = Layer.succeed(
    AppHttpApiClient,
    client as unknown as HttpApiClient.ForApi<AppHttpApi>
  );

  return {
    calls,
    layer,
    makeRegistry: () =>
      AtomRegistry.make({
        initialValues: [
          // SAFETY: appHttpApiRuntime.layer is an atom whose value is the
          // runtime's production Layer. Providing the test layer as initial
          // value replaces all service implementations inside the runtime.
          Atom.initialValue(
            appHttpApiRuntime.layer,
            layer as Layer.Layer<unknown, never>
          ),
        ],
      }),
  };
};

const flush = async () => {
  const promises: Promise<void>[] = [];
  for (let i = 0; i < 30; i += 1) {
    promises.push(Effect.runPromise(Effect.yieldNow));
    promises.push(setTimeout(0));
  }
  await Promise.all(promises);
};

export { AsyncResult, flush };
