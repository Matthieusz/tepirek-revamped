import type {
  SquadEditorInviteTargetSchema,
  SquadGroupEditorGrantSummarySchema,
} from "@tepirek-revamped/api/protocol/squad-builder/squad-group-sharing/squad-group-sharing-schema";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import {
  asAppUserId,
  asSquadGroupId,
  asSquadGroupInvitationId,
} from "@/features/squad-builder/branded-ids";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

interface RespondToSquadGroupInviteInput {
  readonly invitationId: number;
  readonly response: "accept" | "decline";
}
interface RevokeSquadGroupEditorInput {
  readonly groupId: number;
  readonly invitationId: number;
}
interface SearchSquadEditorInviteTargetsInput {
  readonly groupId: number;
  readonly query: string;
}
interface SendSquadGroupEditorInviteInput {
  readonly groupId: number;
  readonly invitedUserId: string;
}
interface SquadGroupEditorGrantsInput {
  readonly groupId: number;
}

type SquadGroupEditorGrantsKey = string;
type SquadEditorInviteTargetsKey = string;

const SquadEditorInviteTargetsKeySchema = Schema.fromJsonString(
  Schema.Tuple([Schema.Finite, Schema.String])
);

type SquadEditorInviteTarget = typeof SquadEditorInviteTargetSchema.Type;
type SquadGroupEditorGrant = SquadGroupEditorGrantSummarySchema;

const disabledSquadGroupEditorGrantsAtom = Atom.make<
  AsyncResult.AsyncResult<readonly SquadGroupEditorGrant[], never>
>(AsyncResult.success([]));
const disabledSquadEditorInviteTargetsAtom = Atom.make<
  AsyncResult.AsyncResult<readonly SquadEditorInviteTarget[], never>
>(AsyncResult.success([]));

const squadGroupEditorGrantsKey = (groupId: number): string => `${groupId}`;

const squadEditorInviteTargetsKey = (
  payload: SearchSquadEditorInviteTargetsInput
): SquadEditorInviteTargetsKey =>
  Schema.encodeSync(SquadEditorInviteTargetsKeySchema)([
    payload.groupId,
    payload.query,
  ]);

const squadEditorInviteTargetsPayloadFromKey = (
  key: SquadEditorInviteTargetsKey
): SearchSquadEditorInviteTargetsInput => {
  const [groupId, query] = Schema.decodeUnknownSync(
    SquadEditorInviteTargetsKeySchema
  )(key);
  return { groupId, query };
};

/** Resource atom for incoming squad-group editor invitations. */
const incomingSquadGroupInvitesByActorAtom = Atom.family(
  (_actorUserId: string) =>
    appHttpApiAtom(
      Effect.gen(function* listIncomingSquadGroupInvitesEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.listIncomingSquadGroupInvites(
          {
            payload: {},
          }
        );
      })
    )
);

export const incomingSquadGroupInvitesAtom =
  incomingSquadGroupInvitesByActorAtom("default");

/** Resource atom for squad groups shared with the current actor. */
const sharedSquadGroupsByActorAtom = Atom.family((_actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listSharedSquadGroupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.listSharedSquadGroups({
        payload: {},
      });
    })
  )
);

export const sharedSquadGroupsAtom = sharedSquadGroupsByActorAtom("default");

/** Resource atom for editor grants on one squad group. */
const squadGroupEditorGrantsByKeyAtom = Atom.family(
  (key: SquadGroupEditorGrantsKey) => {
    const groupId = Schema.decodeUnknownSync(Schema.FiniteFromString)(key);
    return appHttpApiAtom(
      Effect.gen(function* listSquadGroupEditorGrantsEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.listSquadGroupEditorGrants(
          {
            payload: {
              groupId: yield* asSquadGroupId(groupId),
            },
          }
        );
      })
    ).pipe(Atom.setIdleTTL("5 minutes"));
  }
);

export const squadGroupEditorGrantsAtom = (
  payload: SquadGroupEditorGrantsInput
) =>
  payload.groupId > 0
    ? squadGroupEditorGrantsByKeyAtom(
        squadGroupEditorGrantsKey(payload.groupId)
      )
    : disabledSquadGroupEditorGrantsAtom;

/** Resource atom for pending squad-group invite count. */
const pendingSquadGroupInviteCountByActorAtom = Atom.family(
  (_actorUserId: string) =>
    appHttpApiAtom(
      Effect.gen(function* countPendingSquadGroupInvitesEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.countPendingSquadGroupInvites(
          {
            payload: {},
          }
        );
      })
    )
);

const squadEditorInviteTargetsByKeyAtom = Atom.family(
  (key: SquadEditorInviteTargetsKey) => {
    const payload = squadEditorInviteTargetsPayloadFromKey(key);
    return appHttpApiAtom(
      Effect.gen(function* searchSquadEditorInviteTargetsEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.searchSquadEditorInviteTargets(
          {
            payload: {
              groupId: yield* asSquadGroupId(payload.groupId),
              query: payload.query,
            },
          }
        );
      })
    ).pipe(Atom.setIdleTTL("5 minutes"));
  }
);

export const squadEditorInviteTargetsAtom = (
  payload: SearchSquadEditorInviteTargetsInput
) =>
  payload.groupId > 0
    ? squadEditorInviteTargetsByKeyAtom(squadEditorInviteTargetsKey(payload))
    : disabledSquadEditorInviteTargetsAtom;

/** Mutation atom for responding to a squad-group invite. */
export const respondToSquadGroupInviteAtom = appHttpApiFn(
  Effect.fn("Web.SquadGroupSharing.respondToInvite")(
    function* respondToSquadGroupInviteEffect(
      payload: RespondToSquadGroupInviteInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderSquadGroupSharing.respondToSquadGroupInvite({
          payload: {
            invitationId: yield* asSquadGroupInvitationId(payload.invitationId),
            response: payload.response,
          },
        });
      get.refresh(incomingSquadGroupInvitesByActorAtom("default"));
      get.refresh(sharedSquadGroupsByActorAtom("default"));
      get.refresh(pendingSquadGroupInviteCountByActorAtom("default"));
      return result;
    }
  )
);

export const sendSquadGroupEditorInviteAtom = appHttpApiFn(
  Effect.fn("Web.SquadGroupSharing.sendEditorInvite")(
    function* sendSquadGroupEditorInviteEffect(
      payload: SendSquadGroupEditorInviteInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderSquadGroupSharing.sendSquadGroupEditorInvite({
          payload: {
            groupId: yield* asSquadGroupId(payload.groupId),
            invitedUserId: yield* asAppUserId(payload.invitedUserId),
          },
        });
      get.refresh(incomingSquadGroupInvitesByActorAtom("default"));
      get.refresh(sharedSquadGroupsByActorAtom("default"));
      get.refresh(pendingSquadGroupInviteCountByActorAtom("default"));
      get.refresh(
        squadGroupEditorGrantsByKeyAtom(
          squadGroupEditorGrantsKey(payload.groupId)
        )
      );
      return result;
    }
  )
);

export const revokeSquadGroupEditorAtom = appHttpApiFn(
  Effect.fn("Web.SquadGroupSharing.revokeEditor")(
    function* revokeSquadGroupEditorEffect(
      payload: RevokeSquadGroupEditorInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const result =
        yield* client.squadBuilderSquadGroupSharing.revokeSquadGroupEditor({
          payload: {
            invitationId: yield* asSquadGroupInvitationId(payload.invitationId),
          },
        });
      get.refresh(incomingSquadGroupInvitesByActorAtom("default"));
      get.refresh(sharedSquadGroupsByActorAtom("default"));
      get.refresh(pendingSquadGroupInviteCountByActorAtom("default"));
      get.refresh(
        squadGroupEditorGrantsByKeyAtom(
          squadGroupEditorGrantsKey(payload.groupId)
        )
      );
      return result;
    }
  )
);
