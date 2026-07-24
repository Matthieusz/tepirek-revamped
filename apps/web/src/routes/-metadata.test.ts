import { describe, expect, it } from "vitest";

import { Route as RootRoute } from "@/routes/__root";
import { Route as DashboardRoute } from "@/routes/dashboard/route";
import { Route as HomeRoute } from "@/routes/index";
import { Route as LoginRoute } from "@/routes/login";
import { Route as SignupRoute } from "@/routes/signup";
import { Route as WaitingRoomRoute } from "@/routes/waiting-room";

describe("route metadata", () => {
  it("provides root description and social defaults", async () => {
    const head = await RootRoute.options.head?.({} as never);

    expect(head?.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "application-name" }),
        expect.objectContaining({ name: "description" }),
        expect.objectContaining({ name: "theme-color" }),
        expect.objectContaining({ property: "og:title" }),
        expect.objectContaining({ property: "og:description" }),
        expect.objectContaining({ name: "twitter:card" }),
      ])
    );
  });

  it("gives public and authentication routes distinct titles", async () => {
    const homeHead = await HomeRoute.options.head?.({} as never);
    const loginHead = await LoginRoute.options.head?.({} as never);
    const signupHead = await SignupRoute.options.head?.({} as never);
    const waitingRoomHead = await WaitingRoomRoute.options.head?.({} as never);

    expect(homeHead?.meta).toContainEqual({
      title: "Strona główna | Tepirek Revamped",
    });
    expect(loginHead?.meta).toContainEqual({
      title: "Logowanie | Tepirek Revamped",
    });
    expect(signupHead?.meta).toContainEqual({
      title: "Rejestracja | Tepirek Revamped",
    });
    expect(waitingRoomHead?.meta).toContainEqual({
      title: "Oczekiwanie na weryfikację | Tepirek Revamped",
    });
  });

  it("prevents dashboard pages from being indexed", async () => {
    const head = await DashboardRoute.options.head?.({} as never);

    expect(head?.meta).toEqual(
      expect.arrayContaining([{ content: "noindex, nofollow", name: "robots" }])
    );
  });

  it("prevents auth-gated routes from being indexed", async () => {
    const loginHead = await LoginRoute.options.head?.({} as never);
    const signupHead = await SignupRoute.options.head?.({} as never);
    const waitingRoomHead = await WaitingRoomRoute.options.head?.({} as never);

    expect(loginHead?.meta).toEqual(
      expect.arrayContaining([{ content: "noindex, nofollow", name: "robots" }])
    );
    expect(signupHead?.meta).toEqual(
      expect.arrayContaining([{ content: "noindex, nofollow", name: "robots" }])
    );
    expect(waitingRoomHead?.meta).toEqual(
      expect.arrayContaining([{ content: "noindex, nofollow", name: "robots" }])
    );
  });

  it("inherits the actionable root error boundary for dashboard failures", () => {
    expect(DashboardRoute.options.errorComponent).toBeUndefined();
    expect(RootRoute.options.errorComponent).toBeDefined();
  });
});
