import type {
  ApplyAccountRefetchPayload,
  PreviewAccountRefetchPayload,
} from "@tepirek-revamped/api/modules/squad-builder/schema/account-refetch";
import { Effect } from "effect";

import { AppHttpApiClient, appHttpApiFn } from "@/lib/http-api-client-runtime";
import { refreshVisibleOwnedAccountAtoms } from "@/lib/squad-builder/account-import-atoms";
import { refreshVisibleAccountSharingAtoms } from "@/lib/squad-builder/account-sharing-atoms";
import { refreshVisibleSquadGroupAtoms } from "@/lib/squad-builder/squad-group-atoms";

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
  (payload: ApplyAccountRefetchInput, get) =>
    Effect.gen(function* applyAccountRefetchEffect() {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountRefetch.applyAccountRefetch({
          payload,
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
