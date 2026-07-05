import { Effect } from "effect";

import { AppHttpApiClient, appHttpApiFn } from "@/lib/http-api-client-runtime";
import { refreshVisibleOwnedAccountAtoms } from "@/lib/squad-builder/account-import-atoms";
import { refreshVisibleAccountSharingAtoms } from "@/lib/squad-builder/account-sharing-atoms";
import {
  asAppUserId,
  asMargonemAccountId,
  asPendingMargonemAccountRefetchId,
} from "@/lib/squad-builder/branded-ids";
import { refreshVisibleSquadGroupAtoms } from "@/lib/squad-builder/squad-group-atoms";

interface ApplyAccountRefetchInput {
  readonly actorUserId: string;
  readonly refetchPreviewId: number;
}
interface PreviewAccountRefetchInput {
  readonly accountId: number;
  readonly actorUserId: string;
}

/** Mutation atom for previewing account refetch. */
export const previewAccountRefetchAtom = appHttpApiFn(
  (payload: PreviewAccountRefetchInput) =>
    Effect.gen(function* previewAccountRefetchEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountRefetch.previewAccountRefetch({
        payload: {
          accountId: asMargonemAccountId(payload.accountId),
          actorUserId: asAppUserId(payload.actorUserId),
        },
      });
    })
);

/** Mutation atom for applying account refetch. */
export const applyAccountRefetchAtom = appHttpApiFn(
  (payload: ApplyAccountRefetchInput, get) =>
    Effect.gen(function* applyAccountRefetchEffect() {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountRefetch.applyAccountRefetch({
          payload: {
            actorUserId: asAppUserId(payload.actorUserId),
            refetchPreviewId: asPendingMargonemAccountRefetchId(
              payload.refetchPreviewId
            ),
          },
        });
      refreshVisibleOwnedAccountAtoms(get, payload.actorUserId);
      refreshVisibleAccountSharingAtoms(get, {
        accountId: result.accountId,
        actorUserId: payload.actorUserId,
      });
      refreshVisibleSquadGroupAtoms(get, { actorUserId: payload.actorUserId });
      return result;
    })
);
