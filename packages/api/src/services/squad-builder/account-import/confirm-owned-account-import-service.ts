import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { InvalidAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import type {
  DuplicateMargonemAccountError,
  PendingMargonemAccountImportNotFound,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.ts";

/** Input for confirming an owned account import through the service. */
export interface ConfirmOwnedAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly displayName: string;
}

/** Expected failures returned by the Effect confirm owned account import service. */
export type ConfirmOwnedAccountImportError =
  | InvalidAccountDisplayName
  | PendingMargonemAccountImportNotFound
  | DuplicateMargonemAccountError
  | SquadBuilderPersistenceUnavailable;

const currentDate = Clock.currentTimeMillis.pipe(
  EffectRuntime.map((milliseconds) => new Date(milliseconds))
);

/** Save a previously previewed Margonem account and its Jaruna characters. */
const makeConfirm = (store: typeof AccountImportStoreService.Service) =>
  EffectRuntime.fn("AccountImport.confirm")(
    function* confirmOwnedAccountImportEffect(
      input: ConfirmOwnedAccountImportInput
    ) {
      const displayName = yield* parseAccountDisplayName(input.displayName);

      const now = yield* currentDate;
      const pending = yield* store.findPendingImportForConfirmation({
        actorUserId: input.actorUserId,
        now,
        pendingImportId: input.pendingImportId,
      });

      return yield* store.createOwnedAccountFromPendingImport({
        actorUserId: input.actorUserId,
        confirmedAt: now,
        displayName,
        pending,
      });
    }
  );

/** Integration seam that resolves the store from the Effect context. */
export const confirm = (input: ConfirmOwnedAccountImportInput) =>
  AccountImportStoreService.use((store) => makeConfirm(store)(input));

export interface ConfirmOwnedAccountImport {
  readonly confirm: ReturnType<typeof makeConfirm>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class ConfirmOwnedAccountImportService extends Context.Service<
  ConfirmOwnedAccountImportService,
  ConfirmOwnedAccountImport
>()("@tepirek-revamped/api/squad-builder/ConfirmOwnedAccountImportService") {}

export const layer = Layer.effect(
  ConfirmOwnedAccountImportService,
  EffectRuntime.gen(function* layer() {
    const store = yield* AccountImportStoreService;
    return { confirm: makeConfirm(store) };
  })
);
