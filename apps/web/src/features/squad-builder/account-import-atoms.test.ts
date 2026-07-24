import { describe, expect, it } from "vitest";

import {
  ownedAccountsAtom,
  confirmOwnedAccountImportAtom,
} from "@/features/squad-builder/account-import-atoms";
import {
  makeTestLayer,
  waitForAtomResults,
} from "@/lib/test-utils/atom-test-utils";

describe("account import atoms", () => {
  it("confirmOwnedAccountImportAtom refreshes ownedAccountsAtom", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(ownedAccountsAtom);
    await waitForAtomResults(registry, [ownedAccountsAtom]);

    const ownedCallsBefore = calls.filter(
      (c) => c.method === "listOwnedAccounts"
    ).length;

    registry.set(confirmOwnedAccountImportAtom, {
      displayName: "Test Account",
      pendingImportId: 1,
    });
    await waitForAtomResults(registry, [confirmOwnedAccountImportAtom]);

    expect(calls.filter((c) => c.method === "listOwnedAccounts")).toHaveLength(
      ownedCallsBefore + 1
    );
  });

  it("confirmOwnedAccountImportAtom calls confirm then refreshes owned accounts", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.set(confirmOwnedAccountImportAtom, {
      displayName: "My Account",
      pendingImportId: 99,
    });
    await waitForAtomResults(registry, [confirmOwnedAccountImportAtom]);

    const confirmCalls = calls.filter(
      (c) => c.method === "confirmOwnedAccountImport"
    );
    expect(confirmCalls).toHaveLength(1);

    const ownedCalls = calls.filter((c) => c.method === "listOwnedAccounts");
    expect(ownedCalls.length).toBeGreaterThanOrEqual(1);
  });
});
