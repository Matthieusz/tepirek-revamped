import { Atom } from "@effect-atom/atom-react";
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

const visibleOwnedAccountActorIds = new Set<string>();

const ownedAccountsByActorAtom = Atom.family((actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listOwnedAccountsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountImport.listOwnedAccounts({
        payload: {},
      });
    })
  )
);

/** Resource atom for owned accounts. */
export const ownedAccountsAtom = (actorUserId: string) => {
  visibleOwnedAccountActorIds.add(actorUserId);
  return ownedAccountsByActorAtom(actorUserId);
};

export const refreshVisibleOwnedAccountAtoms = (
  get: Atom.FnContext,
  actorUserId?: string
) => {
  for (const visibleActorUserId of visibleOwnedAccountActorIds) {
    if (actorUserId === undefined || visibleActorUserId === actorUserId) {
      get.refresh(ownedAccountsByActorAtom(visibleActorUserId));
    }
  }
};

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
  (payload: ConfirmOwnedAccountImportInput, get) =>
    Effect.gen(function* confirmOwnedAccountImportEffect() {
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
      return result;
    })
);
