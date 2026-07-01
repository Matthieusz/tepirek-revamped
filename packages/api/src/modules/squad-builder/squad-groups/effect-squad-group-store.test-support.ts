import * as Effect from "effect/Effect";

import { EffectSquadGroupStore } from "./squad-group-store";
import type { EffectSquadGroupStoreShape } from "./squad-group-store";

const unhandledStoreCall = (operation: keyof EffectSquadGroupStoreShape) =>
  Effect.die(new Error(`Unexpected EffectSquadGroupStore.${operation} call`));

/** Build an Effect squad-group store test service with explicit operation overrides. */
export const makeEffectSquadGroupStoreTestService = (
  overrides: Partial<EffectSquadGroupStoreShape>
) =>
  EffectSquadGroupStore.of({
    createSquadGroup: () => unhandledStoreCall("createSquadGroup"),
    getSquadGroupDetail: () => unhandledStoreCall("getSquadGroupDetail"),
    listAvailableCharactersForOwner: () =>
      unhandledStoreCall("listAvailableCharactersForOwner"),
    listGlobalSquadGroups: () => unhandledStoreCall("listGlobalSquadGroups"),
    listMySquadGroups: () => unhandledStoreCall("listMySquadGroups"),
    listOwnedAccounts: () => unhandledStoreCall("listOwnedAccounts"),
    setSquadGroupVisibility: () =>
      unhandledStoreCall("setSquadGroupVisibility"),
    ...overrides,
  });
