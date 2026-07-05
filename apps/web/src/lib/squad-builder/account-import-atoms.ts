import { Atom } from "@effect-atom/atom-react";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";
import {
  asAppUserId,
  asPendingMargonemAccountImportId,
} from "@/lib/squad-builder/branded-ids";
import { refreshVisibleSquadGroupAtoms } from "@/lib/squad-builder/squad-group-atoms";

interface ActorInput {
  readonly actorUserId: string;
}
interface ConfirmOwnedAccountImportInput {
  readonly actorUserId: string;
  readonly displayName: string;
  readonly pendingImportId: number;
}
interface PreviewMargonemProfileImportInput {
  readonly actorUserId: string;
  readonly profileUrl: string;
}
interface PreviewOwnedAccountImportsInput {
  readonly actorUserId: string;
  readonly profileUrls: readonly string[];
}

const visibleOwnedAccountActorIds = new Set<string>();

const ownedAccountsByActorAtom = Atom.family((actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listOwnedAccountsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountImport.listOwnedAccounts({
        payload: { actorUserId: asAppUserId(actorUserId) },
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
          payload: {
            actorUserId: asAppUserId(payload.actorUserId),
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
            actorUserId: asAppUserId(payload.actorUserId),
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
            actorUserId: asAppUserId(payload.actorUserId),
            displayName: payload.displayName,
            pendingImportId: asPendingMargonemAccountImportId(
              payload.pendingImportId
            ),
          },
        });
      refreshVisibleOwnedAccountAtoms(get, payload.actorUserId);
      refreshVisibleSquadGroupAtoms(get, { actorUserId: payload.actorUserId });
      return result;
    })
);
