// @vitest-environment happy-dom

import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { ownedAccountsQueryKey } from "@/features/squad-builder/account-queries";
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

import { BulkAccountRefetchWorkflow } from "./bulk-account-refetch-workflow";

const clickButton = (label: string) => {
  const button = [...document.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes(label)
  );

  expect(button).toBeDefined();
  button?.click();
};

describe("BulkAccountRefetchWorkflow", () => {
  it("previews every owned account and only applies after confirmation", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const client = makeTestQueryClient();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    client.queryClient.setQueryData(ownedAccountsQueryKey, []);

    try {
      act(() => {
        root.render(
          <QueryClientProvider client={client.queryClient}>
            <BulkAccountRefetchWorkflow
              accounts={[
                { accountId: 1, displayName: "Pierwsze" },
                { accountId: 2, displayName: "Drugie" },
              ]}
              runner={runner}
            />
          </QueryClientProvider>
        );
      });
      act(() => {
        clickButton("Odśwież wszystkie");
      });
      await act(async () => {
        await vi.waitFor(() => {
          expect(calls).toHaveLength(2);
        });
      });
      expect(calls.map((call) => call.method)).toEqual([
        "previewAccountRefetch",
        "previewAccountRefetch",
      ]);
      expect(calls.map((call) => call.args)).toEqual([
        { accountId: 1 },
        { accountId: 2 },
      ]);
      expect(document.body.textContent).toContain("Pierwsze");
      expect(document.body.textContent).toContain("Drugie");
      act(() => {
        clickButton("Zastosuj zmiany");
      });
      await act(async () => {
        await vi.waitFor(() => {
          expect(calls).toHaveLength(4);
        });
      });
      expect(
        calls.filter((call) => call.method === "applyAccountRefetch")
      ).toHaveLength(2);
      expect(document.body.textContent).toContain("Wyniki odświeżenia");
      expect(
        client.queryClient.getQueryState(ownedAccountsQueryKey)?.isInvalidated
      ).toBe(true);
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
      client.cleanup();
    }
  });
});
