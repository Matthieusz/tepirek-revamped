import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { ownedAccountsAtom } from "@/features/squad-builder/account-import-atoms";
import { applyAccountRefetchAtom } from "@/features/squad-builder/account-refetch-atoms";
import {
  makeTestLayer,
  waitForAtomResults,
} from "@/lib/test-utils/atom-test-utils";

const AccountRefetchPayloadSchema = Schema.Struct({
  refetchPreviewId: Schema.Finite,
});

describe("account refetch atoms", () => {
  it("applyAccountRefetchAtom refreshes ownedAccountsAtom", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(ownedAccountsAtom);
    await waitForAtomResults(registry, [ownedAccountsAtom]);

    const ownedCallsBefore = calls.filter(
      (c) => c.method === "listOwnedAccounts"
    ).length;

    registry.set(applyAccountRefetchAtom, { refetchPreviewId: 7 });
    await waitForAtomResults(registry, [applyAccountRefetchAtom]);

    expect(calls.filter((c) => c.method === "listOwnedAccounts")).toHaveLength(
      ownedCallsBefore + 1
    );
  });

  it("applyAccountRefetchAtom calls the API and returns a result", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.set(applyAccountRefetchAtom, { refetchPreviewId: 42 });
    await waitForAtomResults(registry, [applyAccountRefetchAtom]);

    const applyCalls = calls.filter((c) => c.method === "applyAccountRefetch");
    expect(applyCalls).toHaveLength(1);
    expect(
      Schema.decodeUnknownSync(AccountRefetchPayloadSchema)(applyCalls[0]?.args)
        .refetchPreviewId
    ).toBe(42);
  });
});
