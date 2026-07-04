import type {
  ConfirmOwnedAccountImportPayload,
  PreviewMargonemProfileImportPayload,
  PreviewOwnedAccountImportsPayload,
} from "@tepirek-revamped/api/modules/squad-builder/schema/account-import";
import type { ActorPayload } from "@tepirek-revamped/api/modules/squad-builder/schema/common";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type ActorInput = typeof ActorPayload.Type;
type ConfirmOwnedAccountImportInput =
  typeof ConfirmOwnedAccountImportPayload.Type;
type PreviewMargonemProfileImportInput =
  typeof PreviewMargonemProfileImportPayload.Type;
type PreviewOwnedAccountImportsInput =
  typeof PreviewOwnedAccountImportsPayload.Type;

/** Resource atom for owned accounts. Not available in HttpApi yet. */
export const ownedAccountsAtom = (_payload: ActorInput) =>
  appHttpApiAtom(Effect.succeed([]));

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
