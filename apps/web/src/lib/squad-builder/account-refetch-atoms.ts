import type {
  ApplyAccountRefetchPayload,
  PreviewAccountRefetchPayload,
} from "@tepirek-revamped/api/modules/squad-builder/schema/account-refetch";
import { Effect } from "effect";

import { AppHttpApiClient, appHttpApiFn } from "@/lib/http-api-client-runtime";

type ApplyAccountRefetchInput = typeof ApplyAccountRefetchPayload.Type;
type PreviewAccountRefetchInput = typeof PreviewAccountRefetchPayload.Type;

/** Mutation atom for previewing account refetch. */
export const previewAccountRefetchAtom = appHttpApiFn(
  (payload: PreviewAccountRefetchInput) =>
    Effect.gen(function* previewAccountRefetchEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountRefetch.previewAccountRefetch({
        payload,
      });
    })
);

/** Mutation atom for applying account refetch. */
export const applyAccountRefetchAtom = appHttpApiFn(
  (payload: ApplyAccountRefetchInput) =>
    Effect.gen(function* applyAccountRefetchEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountRefetch.applyAccountRefetch({
        payload,
      });
    })
);
