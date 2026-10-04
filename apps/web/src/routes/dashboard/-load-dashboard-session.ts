import { requireVerified } from "@/lib/route-helpers";
import type { RouterAppContext } from "@/routes/__root";

/** Requires a verified user and supplies the dashboard's authenticated context. */
export const loadDashboardSession = async (
  getUser: RouterAppContext["getUser"]
) => {
  const session = await requireVerified(getUser);

  return { session };
};
