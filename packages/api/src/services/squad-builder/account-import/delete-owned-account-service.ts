import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
} from "../squad-groups/squad-group-errors.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import type {
  DeleteOwnedAccountResult,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.ts";

export interface DeleteOwnedAccountInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

export type DeleteOwnedAccountError =
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | SquadBuilderPersistenceUnavailable;

const makeDelete = (store: typeof AccountImportStoreService.Service) =>
  Effect.fn("AccountImport.deleteOwnedAccount")(
    function* deleteOwnedAccountEffect(input: DeleteOwnedAccountInput) {
      return yield* store.deleteOwnedAccount({
        accountId: input.accountId,
        actorUserId: input.actorUserId,
      });
    }
  );

export const deleteOwnedAccount = (input: DeleteOwnedAccountInput) =>
  AccountImportStoreService.use((store) => makeDelete(store)(input));
export type { DeleteOwnedAccountResult };
