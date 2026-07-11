import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.js";
import type { InvalidAccountDisplayName } from "../../../domain/squad-builder/account-display-name.js";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.js";
import { AccountImportStoreService } from "./account-import-store-service.js";
import type {
  DuplicateMargonemAccountError,
  PendingMargonemAccountImportNotFound,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.js";

/** Input for confirming an owned account import through the service. */
export interface ConfirmOwnedAccountImportServiceInput {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly displayName: string;
}

/** Expected failures returned by the Effect confirm owned account import service. */
export type ConfirmOwnedAccountImportServiceError =
  | InvalidAccountDisplayName
  | PendingMargonemAccountImportNotFound
  | DuplicateMargonemAccountError
  | SquadBuilderPersistenceUnavailable;

const currentDate = Clock.currentTimeMillis.pipe(
  EffectRuntime.map((milliseconds) => new Date(milliseconds))
);

/** Save a previously previewed Margonem account and its Jaruna characters. */
export const confirm = EffectRuntime.fn("AccountImport.confirm")(
  function* confirmOwnedAccountImportEffect(
    input: ConfirmOwnedAccountImportServiceInput
  ) {
    const displayName = yield* parseAccountDisplayName(input.displayName);

    const now = yield* currentDate;
    const pending = yield* AccountImportStoreService.use((store) =>
      store.findPendingImportForConfirmation({
        actorUserId: input.actorUserId,
        now,
        pendingImportId: input.pendingImportId,
      })
    );

    return yield* AccountImportStoreService.use((store) =>
      store.createOwnedAccountFromPendingImport({
        actorUserId: input.actorUserId,
        confirmedAt: now,
        displayName,
        pending,
      })
    );
  }
);

export interface Interface {
  readonly confirm: typeof confirm;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/ConfirmOwnedAccountImportService"
) {}

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* layer() {
    yield* AccountImportStoreService;
    return { confirm };
  })
);
