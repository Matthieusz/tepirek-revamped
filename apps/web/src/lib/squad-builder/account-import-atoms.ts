import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";
import { asPendingMargonemAccountImportId } from "@/lib/squad-builder/branded-ids";

interface ConfirmOwnedAccountImportInput {
  readonly displayName: string;
  readonly pendingImportId: number;
}

interface PreviewMargonemProfileImportInput {
  readonly profileUrl: string;
}

interface PreviewOwnedAccountImportsInput {
  readonly profileUrls: readonly string[];
}

/** Resource atom for owned accounts. */
export const ownedAccountsAtom = appHttpApiAtom(
  Effect.gen(function* listOwnedAccountsEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderAccountImport.listOwnedAccounts({
      payload: {},
    });
  })
);

/** Mutation atom for previewing a profile import. */
export const previewMargonemProfileImportAtom = appHttpApiFn(
  (payload: PreviewMargonemProfileImportInput) =>
    Effect.gen(function* previewMargonemProfileImportEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountImport.previewMargonemProfileImport(
        {
          payload: {
            profileUrl: payload.profileUrl,
          },
        }
      );
    })
);

/** Mutation atom for previewing owned account imports. */
export const previewOwnedAccountImportsAtom = appHttpApiFn(
  (payload: PreviewOwnedAccountImportsInput) =>
    Effect.gen(function* previewOwnedAccountImportsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountImport.previewOwnedAccountImports(
        {
          payload: {
            profileUrls: payload.profileUrls,
          },
        }
      );
    })
);

/** Mutation atom for confirming an owned account import. */
export const confirmOwnedAccountImportAtom = appHttpApiFn(
  (payload: ConfirmOwnedAccountImportInput) =>
    Effect.gen(function* confirmOwnedAccountImportEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountImport.confirmOwnedAccountImport({
        payload: {
          displayName: payload.displayName,
          pendingImportId: asPendingMargonemAccountImportId(
            payload.pendingImportId
          ),
        },
      });
    })
);
