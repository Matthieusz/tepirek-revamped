import { createFileRoute } from "@tanstack/react-router";

import {
  incomingAccountInvitesQueryOptions,
  ownedAccountsQueryOptions,
  sharedAccountsQueryOptions,
} from "@/features/squad-builder/account-queries";

export const Route = createFileRoute("/dashboard/squad-builder/accounts")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query({
        ...ownedAccountsQueryOptions(),
        staleTime: 0,
      }),
      context.queryClient.query({
        ...incomingAccountInvitesQueryOptions(),
        staleTime: 0,
      }),
      context.queryClient.query({
        ...sharedAccountsQueryOptions(),
        staleTime: 0,
      }),
    ]);
  },
  staticData: {
    crumb: "Konta",
  },
});
