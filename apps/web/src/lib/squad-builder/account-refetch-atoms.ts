import type { Atom } from "@effect-atom/atom-react";
import { Effect } from "effect";

import { AppHttpApiClient, appHttpApiFn } from "@/lib/http-api-client-runtime";
import { ownedAccountsAtom } from "@/lib/squad-builder/account-import-atoms";
import {
  asMargonemAccountId,
  asPendingMargonemAccountRefetchId,
} from "@/lib/squad-builder/branded-ids";
import { refreshVisibleSquadGroupAtoms } from "@/lib/squad-builder/squad-group-atoms";

interface ApplyAccountRefetchInput {
  readonly refetchPreviewId: number;
}
interface PreviewAccountRefetchInput {
  readonly accountId: number;
}

/** Mutation atom for previewing account refetch. */
export const previewAccountRefetchAtom = appHttpApiFn(
  (payload: PreviewAccountRefetchInput) =>
    Effect.gen(function* previewAccountRefetchEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountRefetch.previewAccountRefetch({
        payload: {
          accountId: asMargonemAccountId(payload.accountId),
        },
      });
    })
);

/** Mutation atom for applying account refetch. Refreshes owned accounts and squad group atoms on success. */
export const applyAccountRefetchAtom = appHttpApiFn(
  (payload: ApplyAccountRefetchInput, get: Atom.FnContext) =>
    Effect.gen(function* applyAccountRefetchEffect() {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountRefetch.applyAccountRefetch({
          payload: {
            refetchPreviewId: asPendingMargonemAccountRefetchId(
              payload.refetchPreviewId
            ),
          },
        });
      get.refresh(ownedAccountsAtom);
      refreshVisibleSquadGroupAtoms(get);
      return result;
    })
);
