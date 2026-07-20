import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { InvalidAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
} from "../squad-groups/squad-group-errors.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import type { SquadBuilderPersistenceUnavailable } from "./account-import-store.ts";

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

const makeUpdate = (store: typeof AccountImportStoreService.Service) =>
  Effect.fn("AccountImport.updateOwnedAccountDisplayName")(
    function* updateOwnedAccountDisplayNameEffect(
      input: UpdateOwnedAccountDisplayNameInput
    ) {
      const displayName = yield* parseAccountDisplayName(input.displayName);
      const now = yield* Clock.currentTimeMillis.pipe(
        Effect.map((value) => new Date(value))
      );

      return yield* store.updateOwnedAccountDisplayName({
        accountId: input.accountId,
        actorUserId: input.actorUserId,
        displayName,
        now,
      });
    }
  );

export const update = (input: UpdateOwnedAccountDisplayNameInput) =>
  AccountImportStoreService.use((store) => makeUpdate(store)(input));

export interface UpdateOwnedAccountDisplayName {
  readonly update: ReturnType<typeof makeUpdate>;
}

export class UpdateOwnedAccountDisplayNameService extends Context.Service<
  UpdateOwnedAccountDisplayNameService,
  UpdateOwnedAccountDisplayName
>()(
  "@tepirek-revamped/api/squad-builder/UpdateOwnedAccountDisplayNameService"
) {
  static readonly layer = Layer.effect(
    UpdateOwnedAccountDisplayNameService,
    Effect.gen(function* updateOwnedAccountDisplayNameLayer() {
      const store = yield* AccountImportStoreService;
      return UpdateOwnedAccountDisplayNameService.of({
        update: makeUpdate(store),
      });
    })
  );
}
