// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { getRouter } from "@/router";

const routers: ReturnType<typeof getRouter>[] = [];

afterEach(() => {
  for (const router of routers.splice(0)) {
    router.options.context.queryClient.clear();
  }
});

describe("router QueryClient ownership", () => {
  it("gives loaders and React the same wrapped client", () => {
    const router = getRouter();
    routers.push(router);

    expect(router.options.context.queryClient).toBeDefined();
    expect(router.options.Wrap).toEqual(expect.any(Function));
  });

  it("constructs without starting network requests", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    try {
      const router = getRouter();
      routers.push(router);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not share cache between router instances", () => {
    const firstRouter = getRouter();
    const secondRouter = getRouter();
    routers.push(firstRouter, secondRouter);

    const firstClient = firstRouter.options.context.queryClient;
    const secondClient = secondRouter.options.context.queryClient;
    firstClient.setQueryData(["private-data"], { owner: "first" });

    expect(firstClient.getQueryData(["private-data"])).toEqual({
      owner: "first",
    });
    expect(secondClient.getQueryData(["private-data"])).toBeUndefined();
    expect(firstClient).not.toBe(secondClient);
  });
});
