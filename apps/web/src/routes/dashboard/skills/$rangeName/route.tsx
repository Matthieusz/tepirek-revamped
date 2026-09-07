import { createFileRoute } from "@tanstack/react-router";

import {
  skillProfessionsQueryOptions,
  skillRangeBySlugQueryOptions,
  skillsByRangeQueryOptions,
} from "@/features/skills/skill-queries";

import { RangeDetails } from "./-range-details";

export const Route = createFileRoute("/dashboard/skills/$rangeName")({
  component: RangeDetails,
  loader: async ({ context, params }) => {
    const range = await context.queryClient.query(
      skillRangeBySlugQueryOptions(params.rangeName)
    );
    await Promise.all([
      context.queryClient.query(skillProfessionsQueryOptions()),
      range === null
        ? Promise.resolve()
        : context.queryClient.query(skillsByRangeQueryOptions(range.id)),
    ]);

    return { crumb: params.rangeName };
  },
});
