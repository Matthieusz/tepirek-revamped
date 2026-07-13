import { Effect } from "effect";
import type * as Atom from "effect/unstable/reactivity/Atom";

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

/** Mutation atom for previewing owned account imports. */
export const previewOwnedAccountImportsAtom = appHttpApiFn(
  Effect.fnUntraced(function* previewOwnedAccountImportsEffect(
    payload: PreviewOwnedAccountImportsInput
  ) {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderAccountImport.previewOwnedAccountImports({
      payload: {
        profileUrls: payload.profileUrls,
      },
    });
  })
);

/** Mutation atom for confirming an owned account import. Refreshes owned accounts on success. */
export const confirmOwnedAccountImportAtom = appHttpApiFn(
  Effect.fnUntraced(function* confirmOwnedAccountImportEffect(
    payload: ConfirmOwnedAccountImportInput,
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const result =
      yield* client.squadBuilderAccountImport.confirmOwnedAccountImport({
        payload: {
          displayName: payload.displayName,
          pendingImportId: asPendingMargonemAccountImportId(
            payload.pendingImportId
          ),
        },
      });
    get.refresh(ownedAccountsAtom);
    return result;
  })
);
