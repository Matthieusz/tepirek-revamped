import { createFileRoute } from "@tanstack/react-router";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import {
  availableSquadCharactersQueryOptions,
  squadGroupDetailQueryOptions,
} from "@/features/squad-builder/squad-group-queries";

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

    const detail = await context.queryClient.query({
      ...squadGroupDetailQueryOptions(groupId),
      staleTime: 0,
    });

    if (detail.accessRole !== "viewer") {
      await context.queryClient.query({
        ...availableSquadCharactersQueryOptions(groupId),
        staleTime: 0,
      });
    }

    return { groupId };
  },
  staticData: {
    crumb: "Edytor składu",
  },
});
