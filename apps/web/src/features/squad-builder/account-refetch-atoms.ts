import { Effect } from "effect";
import type * as Atom from "effect/unstable/reactivity/Atom";

import { ownedAccountsAtom } from "@/features/squad-builder/account-import-atoms";
import {
  asMargonemAccountId,
  asPendingMargonemAccountRefetchId,
} from "@/features/squad-builder/branded-ids";
import { refreshVisibleSquadGroupAtoms } from "@/features/squad-builder/squad-group-atoms";
import { AppHttpApiClient, appHttpApiFn } from "@/lib/http-api-client-runtime";

interface ApplyAccountRefetchInput {
  readonly refetchPreviewId: number;
}
interface PreviewAccountRefetchInput {
  readonly accountId: number;
}

/** Mutation atom for previewing account refetch. */
export const previewAccountRefetchAtom = appHttpApiFn(
  Effect.fn("Web.SquadAccountRefetch.preview")(
    function* previewAccountRefetchEffect(payload: PreviewAccountRefetchInput) {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountRefetch.previewAccountRefetch({
        payload: {
          accountId: yield* asMargonemAccountId(payload.accountId),
        },
      });
    }
  )
);

/** Mutation atom for applying account refetch. Refreshes owned accounts and squad group atoms on success. */
export const applyAccountRefetchAtom = appHttpApiFn(
  Effect.fn("Web.SquadAccountRefetch.apply")(
    function* applyAccountRefetchEffect(
      payload: ApplyAccountRefetchInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountRefetch.applyAccountRefetch({
          payload: {
            refetchPreviewId: yield* asPendingMargonemAccountRefetchId(
              payload.refetchPreviewId
            ),
          },
        });
      get.refresh(ownedAccountsAtom);
      refreshVisibleSquadGroupAtoms(get);
      return result;
    }
  )
);
