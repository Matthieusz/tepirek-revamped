/* oxlint-disable sort-keys -- TanStack Router route property order is type-sensitive. */
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { legendPricesAtom } from "@/features/legend-pricing/legend-pricing-atoms";
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

export const Route = createFileRoute("/dashboard/cennik")({
  component: CennikRoute,
  validateSearch: Schema.decodeUnknownSync(CennikSearchSchema),
  loader: async ({ context }) => {
    await context.preloadAtomResults(context.atomRegistry, [legendPricesAtom]);
  },
  staticData: {
    crumb: "Cennik legend",
  },
});
