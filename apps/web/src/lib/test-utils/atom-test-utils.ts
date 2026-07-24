import { AppUserIdSchema } from "@tepirek-revamped/api/domain/squad-builder/app-user-id";
import { MargonemAccountAccessIdSchema } from "@tepirek-revamped/api/domain/squad-builder/margonem-account-access-id";
import { MargonemAccountIdSchema } from "@tepirek-revamped/api/domain/squad-builder/margonem-account-id";
import { MargonemProfileIdSchema } from "@tepirek-revamped/api/domain/squad-builder/margonem-profile-id";
import { SquadGroupIdSchema } from "@tepirek-revamped/api/domain/squad-builder/squad-group-id";
import { SquadGroupInvitationIdSchema } from "@tepirek-revamped/api/domain/squad-builder/squad-group-invitation-id";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { OwnedMargonemAccountSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import { ApplyAccountRefetchSuccess } from "@tepirek-revamped/api/protocol/squad-builder/account-refetch/account-refetch-schema";
import {
  AccountAccessInviteSummarySchema,
  RevokeAccountAccessSuccess,
} from "@tepirek-revamped/api/protocol/squad-builder/account-sharing/account-sharing-schema";
import { SquadGroupInvitationSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-group-sharing/squad-group-sharing-schema";
import { SquadGroupDetailSchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import {
  DistributeGoldSuccess,
  HeroIdSchema,
} from "@tepirek-revamped/api/protocol/vault/http-api-contract";
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
import type { AppHttpApiClientService } from "@/lib/http-api-client-runtime";

interface ApiCall {
  readonly args: unknown;
  readonly group: string;
  readonly method: string;
}

interface EndpointIdentity {
  readonly group: string;
  readonly method: string;
}

const FIXTURE_ACCOUNT_ACCESS_ID = MargonemAccountAccessIdSchema.make(1);
const FIXTURE_ACCOUNT_ID = MargonemAccountIdSchema.make(1);
const FIXTURE_GROUP_ID = SquadGroupIdSchema.make(1);
const FIXTURE_GROUP_INVITATION_ID = SquadGroupInvitationIdSchema.make(1);
const FIXTURE_HERO_ID = HeroIdSchema.make(1);
const FIXTURE_PROFILE_ID = MargonemProfileIdSchema.make(1);
const FIXTURE_USER_ID = AppUserIdSchema.make("user");
const FIXTURE_OWNER_ID = AppUserIdSchema.make("owner");

const responseBodies: Readonly<Record<string, unknown>> = {
  "auction/getAuctionSignups": [],
  "auction/getAuctionStats": { totalSignups: 0, uniqueUsers: 0 },
  "auction/removeAuctionSignup": { success: true },
  "auction/toggleAuctionSignup": { action: "added" },
  "bet/delete": { success: true },
  "bet/edit": { success: true },
  "bet/getAllPaginated": {
    items: [],
    pagination: { hasMore: false, limit: 20, page: 1, total: 0 },
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

  const record =
    <Success>(group: string, method: string, result: Success) =>
    (args: { readonly payload: unknown }): Effect.Effect<Success> => {
      calls.push({ args: args.payload, group, method });
      return Effect.succeed(result);
    };

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
  }).pipe(
    Effect.map(
      (generatedClient) =>
        ({
          ...generatedClient,
          auction: {
            ...generatedClient.auction,
            getAuctionSignups: record("auction", "getAuctionSignups", []),
            getAuctionStats: record("auction", "getAuctionStats", {
              totalSignups: 0,
              uniqueUsers: 0,
            }),
            removeAuctionSignup: record("auction", "removeAuctionSignup", {
              success: true as const,
            }),
            toggleAuctionSignup: record("auction", "toggleAuctionSignup", {
              action: "added" as const,
            }),
          },
          bet: {
            ...generatedClient.bet,
            delete: record("bet", "delete", { success: true }),
            edit: record("bet", "edit", { success: true }),
            getAllPaginated: record("bet", "getAllPaginated", {
              items: [],
              pagination: {
                hasMore: false,
                limit: 20,
                page: 1,
                totalItems: 0,
                totalPages: 0,
              },
            }),
            getLatestForCopy: () => {
              calls.push({
                args: {},
                group: "bet",
                method: "getLatestForCopy",
              });
              return Effect.succeed(null);
            },
          },
          ranking: {
            ...generatedClient.ranking,
            getOldestUnpaidEvent: () => {
              calls.push({
                args: {},
                group: "ranking",
                method: "getOldestUnpaidEvent",
              });
              return Effect.succeed(null);
            },
          },
          skills: {
            ...generatedClient.skills,
            getRangeBySlug: record("skills", "getRangeBySlug", null),
            listProfessions: () => Effect.succeed([]),
            listRanges: () => Effect.succeed([]),
            listSkillsByRange: record("skills", "listSkillsByRange", []),
          },
          squadBuilderAccountImport: {
            ...generatedClient.squadBuilderAccountImport,
            confirmOwnedAccountImport: record(
              "squadBuilderAccountImport",
              "confirmOwnedAccountImport",
              OwnedMargonemAccountSummarySchema.make({
                accountId: FIXTURE_ACCOUNT_ID,
                characterCount: 0,
                characterPreviews: [],
                displayName: "",
                generatedProfileUrl: "",
                lastFetchedAt: new Date("2026-01-01T00:00:00.000Z"),
                profileId: FIXTURE_PROFILE_ID,
              })
            ),
            listOwnedAccounts: record(
              "squadBuilderAccountImport",
              "listOwnedAccounts",
              []
            ),
          },
          squadBuilderAccountRefetch: {
            ...generatedClient.squadBuilderAccountRefetch,
            applyAccountRefetch: record(
              "squadBuilderAccountRefetch",
              "applyAccountRefetch",
              ApplyAccountRefetchSuccess.make({
                accountId: FIXTURE_ACCOUNT_ID,
                addedCharacterCount: 0,
                lastFetchedAt: new Date("2026-01-01T00:00:00.000Z"),
                profileId: FIXTURE_PROFILE_ID,
                removedCharacterCount: 0,
                removedSquadCharacterCount: 0,
                updatedCharacterCount: 0,
              })
            ),
          },
          squadBuilderAccountSharing: {
            ...generatedClient.squadBuilderAccountSharing,
            listAccountAccessGrants: record(
              "squadBuilderAccountSharing",
              "listAccountAccessGrants",
              []
            ),
            revokeAccountAccess: record(
              "squadBuilderAccountSharing",
              "revokeAccountAccess",
              RevokeAccountAccessSuccess.make({
                accessId: FIXTURE_ACCOUNT_ACCESS_ID,
                accountId: FIXTURE_ACCOUNT_ID,
                removedSquadCharacterCount: 0,
                revokedUserId: FIXTURE_USER_ID,
              })
            ),
            sendAccountAccessInvite: record(
              "squadBuilderAccountSharing",
              "sendAccountAccessInvite",
              AccountAccessInviteSummarySchema.make({
                accessId: FIXTURE_ACCOUNT_ACCESS_ID,
                accountDisplayName: "",
                accountId: FIXTURE_ACCOUNT_ID,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                generatedProfileUrl: "",
                invitedUserId: FIXTURE_USER_ID,
                ownerUserId: FIXTURE_OWNER_ID,
                ownerUserImage: null,
                ownerUserName: "",
                status: "pending" as const,
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
              })
            ),
          },
          squadBuilderSquadGroup: {
            ...generatedClient.squadBuilderSquadGroup,
            saveSharedSquadGroupCharacters: record(
              "squadBuilderSquadGroup",
              "saveSharedSquadGroupCharacters",
              SquadGroupDetailSchema.make({
                accessRole: "owner" as const,
                groupId: FIXTURE_GROUP_ID,
                name: "",
                ownerUserId: FIXTURE_OWNER_ID,
                squads: [],
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
                visibility: "private" as const,
              })
            ),
            saveSquadGroup: record(
              "squadBuilderSquadGroup",
              "saveSquadGroup",
              SquadGroupDetailSchema.make({
                accessRole: "owner" as const,
                groupId: FIXTURE_GROUP_ID,
                name: "",
                ownerUserId: FIXTURE_OWNER_ID,
                squads: [],
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
                visibility: "private" as const,
              })
            ),
          },
          squadBuilderSquadGroupSharing: {
            ...generatedClient.squadBuilderSquadGroupSharing,
            listSquadGroupEditorGrants: record(
              "squadBuilderSquadGroupSharing",
              "listSquadGroupEditorGrants",
              []
            ),
            revokeSquadGroupEditor: record(
              "squadBuilderSquadGroupSharing",
              "revokeSquadGroupEditor",
              SquadGroupInvitationSummarySchema.make({
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                invitationId: FIXTURE_GROUP_INVITATION_ID,
                ownerUserId: FIXTURE_OWNER_ID,
                ownerUserImage: null,
                ownerUserName: "",
                squadGroupId: FIXTURE_GROUP_ID,
                squadGroupName: "",
                status: "declined" as const,
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
              })
            ),
          },
          vault: {
            ...generatedClient.vault,
            distributeGold: record(
              "vault",
              "distributeGold",
              DistributeGoldSuccess.make({
                goldAmount: 1,
                heroId: FIXTURE_HERO_ID,
                heroName: "",
                pointWorth: 0,
                success: true,
                totalPoints: 0,
                usersUpdated: 0,
              })
            ),
            getVault: record("vault", "getVault", []),
          },
        }) satisfies AppHttpApiClientService
    )
  );

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
    atoms.map((atom) =>
      Effect.runPromise(getResult(registry, atom, { suspendOnWaiting: true }))
    )
  );
};
