import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import type {
  OwnedMargonemAccountSummary,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.ts";

/** Input for listing owned Margonem accounts. */
export interface ListOwnedMargonemAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Expected failures returned by the list owned accounts service. */
export type ListOwnedMargonemAccountsError = SquadBuilderPersistenceUnavailable;

/** Application service for listing Margonem accounts owned by an actor. */
export interface ListOwnedMargonemAccounts {
  readonly list: (
    input: ListOwnedMargonemAccountsInput
  ) => Effect.Effect<
    readonly OwnedMargonemAccountSummary[],
    ListOwnedMargonemAccountsError
  >;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class ListOwnedMargonemAccountsService extends Context.Service<
  ListOwnedMargonemAccountsService,
  ListOwnedMargonemAccounts
>()("@tepirek-revamped/api/squad-builder/ListOwnedMargonemAccountsService") {}

/** List Margonem accounts owned by the actor. */
export const list = Effect.fn("AccountImport.listOwnedAccounts")(
  (input: ListOwnedMargonemAccountsInput) =>
    AccountImportStoreService.use((store) =>
      store.listOwnedAccounts({
        actorUserId: input.actorUserId,
      })
    )
);

export const layer = Layer.effect(
  ListOwnedMargonemAccountsService,
  Effect.gen(function* makeService() {
    const store = yield* AccountImportStoreService;

    return ListOwnedMargonemAccountsService.of({
      list: Effect.fn("AccountImport.listOwnedAccounts")((input) =>
        store.listOwnedAccounts({
          actorUserId: input.actorUserId,
        })
      ),
    });
  })
);
