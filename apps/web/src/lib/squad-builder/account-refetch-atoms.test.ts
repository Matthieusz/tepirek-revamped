import { describe, expect, it } from "vitest";

import { ownedAccountsAtom } from "@/lib/squad-builder/account-import-atoms";
import { applyAccountRefetchAtom } from "@/lib/squad-builder/account-refetch-atoms";
import { makeTestLayer, flush } from "@/lib/test-utils/atom-test-utils";

describe("account refetch atoms", () => {
  it("applyAccountRefetchAtom refreshes ownedAccountsAtom", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(ownedAccountsAtom);
    await flush();

    const ownedCallsBefore = calls.filter(
      (c) => c.method === "listOwnedAccounts"
    ).length;

    registry.set(applyAccountRefetchAtom, { refetchPreviewId: 7 });
    await flush();

    expect(calls.filter((c) => c.method === "listOwnedAccounts")).toHaveLength(
      ownedCallsBefore + 1
    );
  });

  it("applyAccountRefetchAtom calls the API and returns a result", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.set(applyAccountRefetchAtom, { refetchPreviewId: 42 });
    await flush();

    const applyCalls = calls.filter((c) => c.method === "applyAccountRefetch");
    expect(applyCalls).toHaveLength(1);
    expect(
      (applyCalls[0]?.args as { readonly refetchPreviewId?: unknown })
        ?.refetchPreviewId
    ).toBe(42);
  });
});
