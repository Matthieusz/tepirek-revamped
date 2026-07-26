import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { InvalidAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../squad-groups/squad-group-errors.ts";
import { AccountImportStoreService } from "./account-import-store.ts";

export interface UpdateOwnedAccountDisplayNameInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly displayName: string;
}

export type UpdateOwnedAccountDisplayNameError =
  | InvalidAccountDisplayName
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | SquadBuilderPersistenceUnavailable;

export const update = Effect.fn("AccountImport.updateOwnedAccountDisplayName")(
  function* updateOwnedAccountDisplayNameEffect(
    input: UpdateOwnedAccountDisplayNameInput
  ) {
    const store = yield* AccountImportStoreService;
    const displayName = yield* parseAccountDisplayName(input.displayName);
    const now = yield* DateTime.nowAsDate;

    return yield* store.updateOwnedAccountDisplayName({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
      displayName,
      now,
    });
  }
);
