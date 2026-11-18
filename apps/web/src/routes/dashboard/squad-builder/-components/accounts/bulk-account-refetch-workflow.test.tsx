import { QueryClientProvider } from "@tanstack/react-query";
import { Deferred, Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vite-plus/test";

import { ownedAccountsQueryKey } from "@/features/squad-builder/account-queries";
import { makeTestAppEffectQuery } from "@/lib/test-utils/effect-query-test-utils";
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
    const effectQuery = makeTestAppEffectQuery(layer);
    const client = makeTestQueryClient();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    client.queryClient.setQueryData(ownedAccountsQueryKey, []);
    const previewFinished = Deferred.makeUnsafe<boolean>();
    const applyFinished = Deferred.makeUnsafe<boolean>();
    let finished = 0;
    const unsubscribe = client.queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.action.type === "success") {
          finished += 1;
          Effect.runSync(
            Deferred.succeed(
              finished === 1 ? previewFinished : applyFinished,
              true
            )
          );
        }
      });

    try {
      act(() => {
        root.render(
          <QueryClientProvider client={client.queryClient}>
            <BulkAccountRefetchWorkflow
              accounts={[
                { accountId: 1, displayName: "Pierwsze" },
                { accountId: 2, displayName: "Drugie" },
              ]}
              effectQuery={effectQuery}
            />
          </QueryClientProvider>
        );
      });
      await act(async () => {
        clickButton("Odśwież wszystkie");
        await Effect.runPromise(Deferred.await(previewFinished));
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
      await act(async () => {
        clickButton("Zastosuj zmiany");
        await Effect.runPromise(Deferred.await(applyFinished));
      });
      expect(calls).toHaveLength(4);
      expect(
        calls.filter((call) => call.method === "applyAccountRefetch")
      ).toHaveLength(2);
      expect(document.body.textContent).toContain("Wyniki odświeżenia");
      expect(
        client.queryClient.getQueryState(ownedAccountsQueryKey)?.isInvalidated
      ).toBe(true);
    } finally {
      unsubscribe();
      act(() => {
        root.unmount();
      });
      container.remove();
      client.cleanup();
    }
  });
});
