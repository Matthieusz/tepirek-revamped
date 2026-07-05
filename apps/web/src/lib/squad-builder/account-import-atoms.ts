import { Atom } from "@effect-atom/atom-react";
import type {
  ConfirmOwnedAccountImportPayload,
  PreviewMargonemProfileImportPayload,
  PreviewOwnedAccountImportsPayload,
} from "@tepirek-revamped/api/modules/squad-builder/schema/account-import";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";
import { refreshVisibleSquadGroupAtoms } from "@/lib/squad-builder/squad-group-atoms";

interface ActorInput {
  readonly actorUserId: string;
}
type ConfirmOwnedAccountImportInput =
  typeof ConfirmOwnedAccountImportPayload.Type;
type PreviewMargonemProfileImportInput =
  typeof PreviewMargonemProfileImportPayload.Type;
type PreviewOwnedAccountImportsInput =
  typeof PreviewOwnedAccountImportsPayload.Type;

const visibleOwnedAccountActorIds = new Set<string>();

const ownedAccountsByActorAtom = Atom.family((actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listOwnedAccountsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountImport.listOwnedAccounts({
        payload: { actorUserId },
      });
    })
  )
);

/** Resource atom for owned accounts. */
export const ownedAccountsAtom = (payload: ActorInput) => {
  visibleOwnedAccountActorIds.add(payload.actorUserId);
  return ownedAccountsByActorAtom(payload.actorUserId);
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
          payload,
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
          payload,
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
          payload,
        });
      refreshVisibleOwnedAccountAtoms(get, payload.actorUserId);
      refreshVisibleSquadGroupAtoms(get, { actorUserId: payload.actorUserId });
      return result;
    })
);
