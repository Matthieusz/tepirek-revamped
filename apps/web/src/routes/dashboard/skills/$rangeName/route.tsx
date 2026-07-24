import { createFileRoute } from "@tanstack/react-router";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

import {
  skillProfessionsAtom,
  skillRangeBySlugAtom,
  skillsByRangeAtom,
} from "@/features/skills/skill-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";

import { RangeDetails } from "./-range-details";

export const Route = createFileRoute("/dashboard/skills/$rangeName")({
  component: RangeDetails,
  loader: async ({ context, params }) => {
    const rangeAtom = skillRangeBySlugAtom(params.rangeName);
    await preloadAtomResults(context.atomRegistry, [
      rangeAtom,
      skillProfessionsAtom,
    ]);

    const rangeResult = context.atomRegistry.get(rangeAtom);
    if (AsyncResult.isSuccess(rangeResult) && rangeResult.value !== null) {
      await preloadAtomResults(context.atomRegistry, [
        skillsByRangeAtom(rangeResult.value.id),
      ]);
    }

    return { crumb: params.rangeName };
  },
});
