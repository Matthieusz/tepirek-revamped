import type {
  AccountAccessGrantsPayload,
  ActorPayload,
  ApplyAccountRefetchPayload,
  ConfirmOwnedAccountImportPayload,
  PreviewAccountRefetchPayload,
  PreviewMargonemProfileImportPayload,
  PreviewOwnedAccountImportsPayload,
  RespondToAccountAccessInvitePayload,
  RespondToSquadGroupInvitePayload,
  RevokeAccountAccessPayload,
  RevokeSquadGroupEditorPayload,
  SearchAccountInviteTargetsPayload,
  SearchSquadEditorInviteTargetsPayload,
  SendAccountAccessInvitePayload,
  SendSquadGroupEditorInvitePayload,
  SquadGroupEditorGrantsPayload,
} from "@tepirek-revamped/api/modules/squad-builder/http-api-contract";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type ActorInput = typeof ActorPayload.Type;
type AccountAccessGrantsInput = typeof AccountAccessGrantsPayload.Type;
type SquadGroupEditorGrantsInput = typeof SquadGroupEditorGrantsPayload.Type;
type PreviewMargonemProfileImportInput =
  typeof PreviewMargonemProfileImportPayload.Type;
type PreviewOwnedAccountImportsInput =
  typeof PreviewOwnedAccountImportsPayload.Type;
type ConfirmOwnedAccountImportInput =
  typeof ConfirmOwnedAccountImportPayload.Type;
type PreviewAccountRefetchInput = typeof PreviewAccountRefetchPayload.Type;
type ApplyAccountRefetchInput = typeof ApplyAccountRefetchPayload.Type;
type SearchAccountInviteTargetsInput =
  typeof SearchAccountInviteTargetsPayload.Type;
type SendAccountAccessInviteInput = typeof SendAccountAccessInvitePayload.Type;
type RespondToAccountAccessInviteInput =
  typeof RespondToAccountAccessInvitePayload.Type;
type RevokeAccountAccessInput = typeof RevokeAccountAccessPayload.Type;
type SearchSquadEditorInviteTargetsInput =
  typeof SearchSquadEditorInviteTargetsPayload.Type;
type SendSquadGroupEditorInviteInput =
  typeof SendSquadGroupEditorInvitePayload.Type;
type RevokeSquadGroupEditorInput = typeof RevokeSquadGroupEditorPayload.Type;
type RespondToSquadGroupInviteInput =
  typeof RespondToSquadGroupInvitePayload.Type;

interface SquadGroupIdInput {
  readonly actorUserId: string;
  readonly groupId: number;
}

/** Resource atom for owned accounts. Not available in HttpApi yet. */
export const ownedAccountsAtom = (_payload: ActorInput) =>
  appHttpApiAtom(Effect.succeed([]));

export const squadGroupDetailAtom = (_payload: SquadGroupIdInput) =>
  appHttpApiAtom(Effect.succeed());

export const availableSquadCharactersAtom = (_payload: SquadGroupIdInput) =>
  appHttpApiAtom(Effect.succeed([]));

export const squadEditorInviteTargetsAtom = (
  payload: SearchSquadEditorInviteTargetsInput
) =>
  appHttpApiAtom(
    Effect.gen(function* searchSquadEditorInviteTargetsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.searchSquadEditorInviteTargets(
        { payload }
      );
    })
  );

export const saveSquadGroupAtom = appHttpApiFn((_payload: unknown) =>
  Effect.fail(
    new Error(
      "Zapisywanie grup składów nie zostało jeszcze przeniesione na Effect HttpApi."
    )
  )
);

export const saveSharedSquadGroupCharactersAtom = appHttpApiFn(
  (_payload: unknown) =>
    Effect.fail(
      new Error(
        "Zapisywanie składów współdzielonych nie zostało jeszcze przeniesione na Effect HttpApi."
      )
    )
);

export const setSquadGroupVisibilityAtom = appHttpApiFn((_payload: unknown) =>
  Effect.fail(
    new Error(
      "Zmiana widoczności nie została jeszcze przeniesiona na Effect HttpApi."
    )
  )
);

/** Resource atom for incoming squad-builder account invitations. */
export const incomingAccountInvitesAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* listIncomingAccountInvitesEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listIncomingAccountInvites(
        {
          payload,
        }
      );
    })
  );

/** Resource atom for accounts shared with the current actor. */
export const sharedAccountsAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* listSharedAccountsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listSharedAccounts({
        payload,
      });
    })
  );

/** Resource atom for access grants on one account. */
export const accountAccessGrantsAtom = (payload: AccountAccessGrantsInput) =>
  appHttpApiAtom(
    Effect.gen(function* listAccountAccessGrantsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.listAccountAccessGrants({
        payload,
      });
    })
  );

/** Resource atom for account invite target search. */
export const accountInviteTargetsAtom = (
  payload: SearchAccountInviteTargetsInput
) =>
  appHttpApiAtom(
    Effect.gen(function* searchAccountInviteTargetsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.searchAccountInviteTargets(
        {
          payload,
        }
      );
    })
  );

/** Resource atom for incoming squad-group editor invitations. */
export const incomingSquadGroupInvitesAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* listIncomingSquadGroupInvitesEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.listIncomingSquadGroupInvites(
        {
          payload,
        }
      );
    })
  );

/** Resource atom for squad groups shared with the current actor. */
export const sharedSquadGroupsAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* listSharedSquadGroupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.listSharedSquadGroups({
        payload,
      });
    })
  );

/** Resource atom for editor grants on one squad group. */
export const squadGroupEditorGrantsAtom = (
  payload: SquadGroupEditorGrantsInput
) =>
  appHttpApiAtom(
    Effect.gen(function* listSquadGroupEditorGrantsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.listSquadGroupEditorGrants(
        {
          payload,
        }
      );
    })
  );

/** Resource atom for pending squad-group invite count. */
export const pendingSquadGroupInviteCountAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* countPendingSquadGroupInvitesEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.countPendingSquadGroupInvites(
        {
          payload,
        }
      );
    })
  );

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
  (payload: ConfirmOwnedAccountImportInput) =>
    Effect.gen(function* confirmOwnedAccountImportEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountImport.confirmOwnedAccountImport({
        payload,
      });
    })
);

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

/** Mutation atom for sending an account access invite. */
export const sendAccountAccessInviteAtom = appHttpApiFn(
  (payload: SendAccountAccessInviteInput) =>
    Effect.gen(function* sendAccountAccessInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.sendAccountAccessInvite({
        payload,
      });
    })
);

/** Mutation atom for responding to an account access invite. */
export const respondToAccountAccessInviteAtom = appHttpApiFn(
  (payload: RespondToAccountAccessInviteInput) =>
    Effect.gen(function* respondToAccountAccessInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.respondToAccountAccessInvite(
        {
          payload,
        }
      );
    })
);

/** Mutation atom for revoking account access. */
export const revokeAccountAccessAtom = appHttpApiFn(
  (payload: RevokeAccountAccessInput) =>
    Effect.gen(function* revokeAccountAccessEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderAccountSharing.revokeAccountAccess({
        payload,
      });
    })
);

/** Mutation atom for responding to a squad-group invite. */
export const respondToSquadGroupInviteAtom = appHttpApiFn(
  (payload: RespondToSquadGroupInviteInput) =>
    Effect.gen(function* respondToSquadGroupInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.respondToSquadGroupInvite(
        {
          payload,
        }
      );
    })
);

export const sendSquadGroupEditorInviteAtom = appHttpApiFn(
  (payload: SendSquadGroupEditorInviteInput) =>
    Effect.gen(function* sendSquadGroupEditorInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.sendSquadGroupEditorInvite(
        { payload }
      );
    })
);

export const revokeSquadGroupEditorAtom = appHttpApiFn(
  (payload: RevokeSquadGroupEditorInput) =>
    Effect.gen(function* revokeSquadGroupEditorEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.revokeSquadGroupEditor(
        { payload }
      );
    })
);
