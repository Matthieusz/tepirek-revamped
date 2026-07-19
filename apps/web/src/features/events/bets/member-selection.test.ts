import { describe, expect, it } from "vitest";

import type { SelectableUser } from "@/features/events/bets/user-select-list";

import {
  clearSelection,
  copyLastBet,
  filterUsersBySearch,
  getAvailableListState,
  getAvailableUsers,
  getPointsPreview,
  getSelectedUsers,
  removeUser,
  restoreSelection,
  toggleUser,
} from "./member-selection";

const users: SelectableUser[] = [
  { id: "u1", image: null, name: "Alice" },
  { id: "u2", image: null, name: "Bob" },
  { id: "u3", image: null, name: "Charlie" },
];

describe("filterUsersBySearch", () => {
  it("filters users by name case-insensitively", () => {
    expect(filterUsersBySearch(users, "ali")).toEqual([users[0]]);
    expect(filterUsersBySearch(users, "BOB")).toEqual([users[1]]);
  });

  it("returns all users for an empty search", () => {
    expect(filterUsersBySearch(users, "")).toEqual(users);
  });
});

describe("getAvailableUsers", () => {
  it("excludes selected users", () => {
    expect(getAvailableUsers(users, ["u1"], "").map((u) => u.id)).toEqual([
      "u2",
      "u3",
    ]);
  });

  it("applies the search on top of excluding selected", () => {
    expect(getAvailableUsers(users, ["u1"], "char").map((u) => u.id)).toEqual([
      "u3",
    ]);
  });

  it("returns an empty list when users is undefined", () => {
    expect(getAvailableUsers(undefined, [], "")).toEqual([]);
  });
});

describe("getSelectedUsers", () => {
  it("returns selected users in the verified-users list order", () => {
    // Selection order is reversed; result follows the users list order.
    expect(getSelectedUsers(users, ["u3", "u1"]).map((u) => u.id)).toEqual([
      "u1",
      "u3",
    ]);
  });

  it("returns an empty list when users is undefined", () => {
    expect(getSelectedUsers(undefined, ["u1"])).toEqual([]);
  });
});

describe("toggleUser", () => {
  it("adds a user when toggled on", () => {
    expect(toggleUser("u2", ["u1"])).toEqual(["u1", "u2"]);
  });

  it("removes a user when toggled off", () => {
    expect(toggleUser("u1", ["u1", "u2"])).toEqual(["u2"]);
  });

  it("does not mutate the original selected users", () => {
    const current = ["u1"];
    toggleUser("u2", current);
    expect(current).toEqual(["u1"]);
  });
});

describe("removeUser", () => {
  it("removes the given user", () => {
    expect(removeUser("u1", ["u1", "u2"])).toEqual(["u2"]);
  });
});

describe("clearSelection", () => {
  it("returns an empty array", () => {
    expect(clearSelection()).toEqual([]);
  });
});

describe("restoreSelection", () => {
  it("resets to the initial member IDs", () => {
    expect(restoreSelection(["u1", "u2"])).toEqual(["u1", "u2"]);
  });

  it("returns a new array, not the input reference", () => {
    const initial = ["u1", "u2"];
    expect(restoreSelection(initial)).not.toBe(initial);
  });
});

describe("copyLastBet", () => {
  it("maps the last bet's members to selected user IDs", () => {
    const lastBet = {
      members: [{ userId: "u2" }, { userId: "u3" }],
    };
    expect(copyLastBet(lastBet)).toEqual(["u2", "u3"]);
  });

  it("returns an empty array when there is no last bet", () => {
    expect(copyLastBet()).toEqual([]);
  });
});

describe("getAvailableListState", () => {
  it("reports loading first", () => {
    expect(
      getAvailableListState({
        availableUsers: [],
        users,
        usersLoading: true,
      })
    ).toBe("loading");
  });

  it("reports no-users when the verified list is empty", () => {
    expect(
      getAvailableListState({
        availableUsers: [],
        users: [],
        usersLoading: false,
      })
    ).toBe("no-users");
  });

  it("reports no-search-results when the search excludes everyone", () => {
    expect(
      getAvailableListState({
        availableUsers: [],
        users,
        usersLoading: false,
      })
    ).toBe("no-search-results");
  });

  it("reports has-users when available users exist", () => {
    expect(
      getAvailableListState({
        availableUsers: [{ id: "u1", image: null, name: "Alice" }],
        users,
        usersLoading: false,
      })
    ).toBe("has-users");
  });
});

describe("getPointsPreview", () => {
  it("marks an increase as default", () => {
    const preview = getPointsPreview(1, 3);
    expect(preview.newPointsPerMember).toBeGreaterThan(
      preview.currentPointsPerMember
    );
    expect(preview.variant).toBe("default");
  });

  it("marks a decrease as destructive", () => {
    const preview = getPointsPreview(3, 1);
    expect(preview.newPointsPerMember).toBeLessThan(
      preview.currentPointsPerMember
    );
    expect(preview.variant).toBe("destructive");
  });

  it("marks an unchanged count as secondary", () => {
    const preview = getPointsPreview(2, 2);
    expect(preview.variant).toBe("secondary");
  });

  it("points-per-member changes with member count", () => {
    expect(getPointsPreview(1, 1).newPointsPerMember).toBe(20);
    expect(getPointsPreview(3, 3).newPointsPerMember).toBe(6.66);
  });
});
