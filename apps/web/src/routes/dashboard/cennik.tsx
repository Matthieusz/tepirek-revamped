import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { legendPricesQueryOptions } from "@/features/legend-pricing/legend-pricing-queries";
import CennikPage from "@/routes/dashboard/-components/cennik-page";

const routeApi = getRouteApi("/dashboard/cennik");

const CennikRoute = () => {
  const { session } = routeApi.useRouteContext();
  const search = routeApi.useSearch();

  return <CennikPage search={search} session={session} />;
};

const CennikSearchSchema = Schema.Struct({
  itemLevel: Schema.optional(Schema.String),
  itemName: Schema.optional(Schema.String),
  monsterName: Schema.optional(Schema.String),
  monsterType: Schema.optional(Schema.Literals(["hero", "elite2"])),
});

export type CennikSearch = typeof CennikSearchSchema.Type;

/* oxlint-disable sort-keys -- TanStack Router inference requires dependency order, not alphabetical order. */
export const Route = createFileRoute("/dashboard/cennik")({
  validateSearch: Schema.decodeUnknownSync(CennikSearchSchema),
  component: CennikRoute,
  loader: async ({ context }) => {
    await context.queryClient.query(legendPricesQueryOptions());
  },
  staticData: {
    crumb: "Cennik legend",
  },
});
/* oxlint-enable sort-keys */
