import * as Effect from "effect/Effect";

import { SquadGroupAggregateStoreService } from "./squad-group-aggregate-store.ts";

/** Delete a squad group through the application-owned aggregate port. */
export const deleteSquadGroup = Effect.fn("SquadGroup.delete")(
  function* deleteSquadGroup(
    input: Parameters<
      (typeof SquadGroupAggregateStoreService.Service)["deleteSquadGroup"]
    >[0]
  ) {
    const store = yield* SquadGroupAggregateStoreService;
    return yield* store.deleteSquadGroup(input);
  }
);

/** List groups owned by an application user. */
export const listOwnedSquadGroups = Effect.fn("SquadGroup.listOwned")(
  function* listOwnedSquadGroups(
    input: Parameters<
      (typeof SquadGroupAggregateStoreService.Service)["listMySquadGroups"]
    >[0]
  ) {
    const store = yield* SquadGroupAggregateStoreService;
    return yield* store.listMySquadGroups(input);
  }
);

/** Load a group detail after applying access policy in the application port. */
export const getSquadGroupDetail = Effect.fn("SquadGroup.getDetail")(
  function* getSquadGroupDetail(
    input: Parameters<
      (typeof SquadGroupAggregateStoreService.Service)["getSquadGroupDetail"]
    >[0]
  ) {
    const store = yield* SquadGroupAggregateStoreService;
    return yield* store.getSquadGroupDetail(input);
  }
);
