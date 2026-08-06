import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { Atom, AtomRegistry } from "effect/unstable/reactivity";
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type * as AtomType from "effect/unstable/reactivity/Atom";
import type * as AtomRegistryType from "effect/unstable/reactivity/AtomRegistry";
import { getResult } from "effect/unstable/reactivity/AtomRegistry";

import {
  AppHttpApiClient,
  appHttpApiRuntime,
} from "@/lib/http-api-client-runtime";

interface ApiCall {
  readonly args: unknown;
  readonly group: string;
  readonly method: string;
}

interface EndpointIdentity {
  readonly group: string;
  readonly method: string;
}

const responseBodies: Readonly<Record<string, unknown>> = {
  "auction/getAuctionSignups": [],
  "auction/getAuctionStats": { totalSignups: 0, uniqueUsers: 0 },
  "auction/removeAuctionSignup": { success: true },
  "auction/toggleAuctionSignup": { action: "added" },
  "bet/delete": { success: true },
  "bet/edit": { success: true },
  "bet/getAllPaginated": {
    items: [],
    pagination: {
      hasMore: false,
      limit: 20,
      page: 1,
      totalItems: 0,
      totalPages: 0,
    },
  },
  "bet/getLatestForCopy": null,
  "ranking/getOldestUnpaidEvent": null,
  "skills/getRangeBySlug": null,
  "skills/listProfessions": [],
  "skills/listRanges": [],
  "skills/listSkillsByRange": [],
  "squadBuilderAccountImport/confirmOwnedAccountImport": {
    accountId: 1,
    characterCount: 0,
    characterPreviews: [],
    displayName: "",
    generatedProfileUrl: "",
    lastFetchedAt: "2026-01-01T00:00:00.000Z",
    profileId: 1,
  },
  "squadBuilderAccountImport/listOwnedAccounts": [],
  "squadBuilderAccountRefetch/applyAccountRefetch": {
    accountId: 1,
    addedCharacterCount: 0,
    lastFetchedAt: "2026-01-01T00:00:00.000Z",
    profileId: 1,
    removedCharacterCount: 0,
    removedSquadCharacterCount: 0,
    updatedCharacterCount: 0,
  },
  "squadBuilderAccountSharing/listAccountAccessGrants": [],
  "squadBuilderAccountSharing/revokeAccountAccess": {
    accessId: 1,
    accountId: 1,
    removedSquadCharacterCount: 0,
    revokedUserId: "user",
  },
  "squadBuilderAccountSharing/sendAccountAccessInvite": {
    accessId: 1,
    accountDisplayName: "",
    accountId: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    generatedProfileUrl: "",
    invitedUserId: "user",
    ownerUserId: "owner",
    ownerUserImage: null,
    ownerUserName: "",
    status: "pending",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  "squadBuilderSquadGroup/saveSharedSquadGroupCharacters": {
    accessRole: "owner",
    groupId: 1,
    name: "",
    ownerUserId: "owner",
    squads: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    visibility: "private",
  },
  "squadBuilderSquadGroup/saveSquadGroup": {
    accessRole: "owner",
    groupId: 1,
    name: "",
    ownerUserId: "owner",
    squads: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    visibility: "private",
  },
  "squadBuilderSquadGroupSharing/countPendingSquadGroupInvites": 0,
  "squadBuilderSquadGroupSharing/listSquadGroupEditorGrants": [],
  "squadBuilderSquadGroupSharing/revokeSquadGroupEditor": {
    createdAt: "2026-01-01T00:00:00.000Z",
    invitationId: 1,
    ownerUserId: "owner",
    ownerUserImage: null,
    ownerUserName: "",
    squadGroupId: 1,
    squadGroupName: "",
    status: "declined",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  "vault/distributeGold": {
    goldAmount: 1,
    heroId: 1,
    heroName: "",
    pointWorth: 0,
    success: true,
    totalPoints: 0,
    usersUpdated: 0,
  },
  "vault/getVault": [],
};

const makeEndpointLookup = (): ReadonlyMap<string, EndpointIdentity> => {
  const endpoints = new Map<string, EndpointIdentity>();

  for (const [groupName, group] of Object.entries(AppHttpApi.groups)) {
    for (const [method, endpoint] of Object.entries(group.endpoints)) {
      endpoints.set(endpoint.path, { group: groupName, method });
    }
  }

  return endpoints;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const decodePayload = (body: Uint8Array): unknown =>
  JSON.parse(new TextDecoder().decode(body), (_key, value: unknown) =>
    typeof value === "string" && ISO_DATE_PATTERN.test(value)
      ? new Date(value)
      : value
  );

export const makeTestLayer = () => {
  const calls: ApiCall[] = [];
  const endpoints = makeEndpointLookup();

  const httpClient = HttpClient.make((request, url) => {
    const endpoint = endpoints.get(url.pathname);
    if (endpoint === undefined) {
      return Effect.die(new Error(`Unhandled test endpoint: ${url.pathname}`));
    }

    const args =
      request.body._tag === "Uint8Array"
        ? decodePayload(request.body.body)
        : {};
    calls.push({ args, ...endpoint });

    const responseKey = `${endpoint.group}/${endpoint.method}`;
    const responseBody = responseBodies[responseKey];
    const response =
      responseBody === undefined
        ? new Response(null, { status: 200 })
        : Response.json(responseBody);

    return Effect.succeed(HttpClientResponse.fromWeb(request, response));
  });

  const clientEffect = HttpApiClient.makeWith(AppHttpApi, {
    baseUrl: "http://localhost",
    httpClient,
  });

  const layer = Layer.effect(AppHttpApiClient, clientEffect);

  return {
    calls,
    layer,
    makeRegistry: () =>
      AtomRegistry.make({
        initialValues: [Atom.initialValue(appHttpApiRuntime.layer, layer)],
      }),
  };
};

type AsyncResultAtom = AtomType.Atom<AsyncResult.AsyncResult<unknown, unknown>>;

/** Waits until every supplied atom has reached a non-waiting result. */
export const waitForAtomResults = async (
  registry: AtomRegistryType.AtomRegistry,
  atoms: readonly AsyncResultAtom[]
): Promise<void> => {
  await Promise.all(
    atoms.map(
      async (atom) =>
        await Effect.runPromise(
          getResult(registry, atom, { suspendOnWaiting: true })
        )
    )
  );
};
