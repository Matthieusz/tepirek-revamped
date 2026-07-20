import { Effect } from "effect";
import type * as Atom from "effect/unstable/reactivity/Atom";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";
import {
  incomingAccountInvitesAtom,
  sharedAccountsAtom,
} from "@/lib/squad-builder/account-sharing-atoms";
import {
  asMargonemAccountId,
  asPendingMargonemAccountImportId,
} from "@/lib/squad-builder/branded-ids";
import { refreshVisibleSquadGroupAtoms } from "@/lib/squad-builder/squad-group-atoms";

interface ConfirmOwnedAccountImportInput {
  readonly displayName: string;
  readonly pendingImportId: number;
}

interface PreviewOwnedAccountImportsInput {
  readonly profileUrls: readonly string[];
}

interface UpdateOwnedAccountDisplayNameInput {
  readonly accountId: number;
  readonly displayName: string;
}

interface DeleteOwnedAccountInput {
  readonly accountId: number;
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
  Effect.fn("Web.SquadAccountImport.preview")(
    function* previewOwnedAccountImportsEffect(
      payload: PreviewOwnedAccountImportsInput
    ) {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountImport.previewOwnedAccountImports(
        {
          payload: {
            profileUrls: payload.profileUrls,
          },
        }
      );
    }
  )
);

/** Mutation atom for confirming an owned account import. Refreshes owned accounts on success. */
export const confirmOwnedAccountImportAtom = appHttpApiFn(
  Effect.fn("Web.SquadAccountImport.confirm")(
    function* confirmOwnedAccountImportEffect(
      payload: ConfirmOwnedAccountImportInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountImport.confirmOwnedAccountImport({
          payload: {
            displayName: payload.displayName,
            pendingImportId: yield* asPendingMargonemAccountImportId(
              payload.pendingImportId
            ),
          },
        });
      get.refresh(ownedAccountsAtom);
      return result;
    }
  )
);

/** Mutation atom for renaming an owned account. */
export const updateOwnedAccountDisplayNameAtom = appHttpApiFn(
  Effect.fn("Web.SquadAccountImport.updateDisplayName")(
    function* updateOwnedAccountDisplayNameEffect(
      payload: UpdateOwnedAccountDisplayNameInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderAccountImport.updateOwnedAccountDisplayName({
          payload: {
            accountId: yield* asMargonemAccountId(payload.accountId),
            displayName: payload.displayName,
          },
        });
      get.refresh(ownedAccountsAtom);
      return result;
    }
  )
);

/** Mutation atom for deleting an owned account and its linked squad data. */
export const deleteOwnedAccountAtom = appHttpApiFn(
  Effect.fn("Web.SquadAccountImport.delete")(function* deleteOwnedAccountEffect(
    payload: DeleteOwnedAccountInput,
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const result = yield* client.squadBuilderAccountImport.deleteOwnedAccount({
      payload: { accountId: yield* asMargonemAccountId(payload.accountId) },
    });
    get.refresh(ownedAccountsAtom);
    get.refresh(sharedAccountsAtom);
    get.refresh(incomingAccountInvitesAtom);
    refreshVisibleSquadGroupAtoms(get);
    return result;
  })
);
