import { Effect } from "effect";

import { AppHttpApiClient, appHttpApiFn } from "@/lib/http-api-client-runtime";
import {
  asMargonemAccountId,
  asPendingMargonemAccountRefetchId,
} from "@/lib/squad-builder/branded-ids";

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

/** Mutation atom for applying account refetch. */
export const applyAccountRefetchAtom = appHttpApiFn(
  (payload: ApplyAccountRefetchInput) =>
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
      return result;
    })
);
