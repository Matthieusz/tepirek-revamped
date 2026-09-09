import { Effect } from "effect";

import {
  asMargonemAccountId,
  asPendingMargonemAccountRefetchId,
} from "@/features/squad-builder/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

export interface PreviewAccountRefetchInput {
  readonly accountId: number;
}

export interface ApplyAccountRefetchInput {
  readonly refetchPreviewId: number;
}

/** Previews changes to one owned Margonem account. */
export const previewAccountRefetch = Effect.fn(
  "Web.SquadAccountRefetch.preview"
)(function* previewAccountRefetchEffect(input: PreviewAccountRefetchInput) {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderAccountRefetch.previewAccountRefetch({
    payload: {
      accountId: yield* asMargonemAccountId(input.accountId),
    },
  });
});

/** Applies a previously created account refetch preview. */
export const applyAccountRefetch = Effect.fn("Web.SquadAccountRefetch.apply")(
  function* applyAccountRefetchEffect(input: ApplyAccountRefetchInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderAccountRefetch.applyAccountRefetch({
      payload: {
        refetchPreviewId: yield* asPendingMargonemAccountRefetchId(
          input.refetchPreviewId
        ),
      },
    });
  }
);

/** Runs account-refetch API effects through the application HTTP client. */
export type AccountRefetchApiRunner = typeof runAppHttpApi;
