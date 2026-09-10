import { Effect } from "effect";

import {
  asMargonemAccountId,
  asPendingMargonemAccountImportId,
} from "@/features/squad-builder/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

export interface ConfirmOwnedAccountImportInput {
  readonly displayName: string;
  readonly pendingImportId: number;
}

export interface PreviewOwnedAccountImportsInput {
  readonly profileUrls: readonly string[];
}

export interface UpdateOwnedAccountDisplayNameInput {
  readonly accountId: number;
  readonly displayName: string;
}

export interface DeleteOwnedAccountInput {
  readonly accountId: number;
}

/** Lists accounts owned by the authenticated user. */
export const listOwnedAccounts = Effect.fn("Web.SquadAccountImport.listOwned")(
  function* listOwnedAccountsEffect() {
    const client = yield* AppHttpApiClient;

    return yield* client.squadBuilderAccountImport.listOwnedAccounts({
      payload: {},
    });
  }
);

/** Previews one or more Margonem profile URLs without persisting accounts. */
export const previewOwnedAccountImports = Effect.fn(
  "Web.SquadAccountImport.preview"
)(function* previewOwnedAccountImportsEffect(
  input: PreviewOwnedAccountImportsInput
) {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderAccountImport.previewOwnedAccountImports({
    payload: { profileUrls: input.profileUrls },
  });
});

/** Persists one previously previewed account import. */
export const confirmOwnedAccountImport = Effect.fn(
  "Web.SquadAccountImport.confirm"
)(function* confirmOwnedAccountImportEffect(
  input: ConfirmOwnedAccountImportInput
) {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderAccountImport.confirmOwnedAccountImport({
    payload: {
      displayName: input.displayName,
      pendingImportId: yield* asPendingMargonemAccountImportId(
        input.pendingImportId
      ),
    },
  });
});

/** Renames an account owned by the authenticated user. */
export const updateOwnedAccountDisplayName = Effect.fn(
  "Web.SquadAccountImport.updateDisplayName"
)(function* updateOwnedAccountDisplayNameEffect(
  input: UpdateOwnedAccountDisplayNameInput
) {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderAccountImport.updateOwnedAccountDisplayName({
    payload: {
      accountId: yield* asMargonemAccountId(input.accountId),
      displayName: input.displayName,
    },
  });
});

/** Deletes an account and its linked squad data. */
export const deleteOwnedAccount = Effect.fn("Web.SquadAccountImport.delete")(
  function* deleteOwnedAccountEffect(input: DeleteOwnedAccountInput) {
    const client = yield* AppHttpApiClient;

    return yield* client.squadBuilderAccountImport.deleteOwnedAccount({
      payload: { accountId: yield* asMargonemAccountId(input.accountId) },
    });
  }
);

/** Runs account-import API effects through the application HTTP client. */
export type AccountImportApiRunner = typeof runAppHttpApi;
