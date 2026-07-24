import { createFileRoute } from "@tanstack/react-router";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

import {
  availableSquadCharactersAtom,
  squadGroupDetailAtom,
} from "@/features/squad-builder/squad-group-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";

const decodeSquadGroupId = Schema.decodeUnknownOption(
  Schema.FiniteFromString.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isGreaterThan(0))
  )
);

export const Route = createFileRoute(
  "/dashboard/squad-builder/squads_/$groupId"
)({
  loader: async ({ context, params }) => {
    const groupId = Option.getOrNull(decodeSquadGroupId(params.groupId));
    if (groupId === null) {
      return { groupId };
    }

    const detailAtom = squadGroupDetailAtom({ groupId });
    await preloadAtomResults(context.atomRegistry, [detailAtom]);

    const detailResult = context.atomRegistry.get(detailAtom);
    if (
      AsyncResult.isSuccess(detailResult) &&
      detailResult.value.accessRole !== "viewer"
    ) {
      await preloadAtomResults(context.atomRegistry, [
        availableSquadCharactersAtom({ groupId }),
      ]);
    }

    return { groupId };
  },
  staticData: {
    crumb: "Edytor składu",
  },
});
