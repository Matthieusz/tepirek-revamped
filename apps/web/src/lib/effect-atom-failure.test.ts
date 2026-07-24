import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { describe, expect, it } from "vitest";

import {
  announcementsAtom,
  optimisticAnnouncementsAtom,
} from "@/features/announcements/announcement-atoms";
import {
  auctionSignupsAtom,
  optimisticAuctionSignupsAtom,
} from "@/features/auctions/auction-atoms";
import { paginatedBetsAtom } from "@/features/events/bets/bet-atoms";
import {
  optimisticEventsAtom,
  eventsAtom,
} from "@/features/events/core/event-atoms";
import {
  heroesAtom,
  optimisticHeroesAtom,
} from "@/features/events/heroes/hero-atoms";
import { rankingAtom } from "@/features/events/ranking/ranking-atoms";
import {
  optimisticVaultAtom,
  vaultAtom,
} from "@/features/events/vault/vault-atoms";
import {
  optimisticSkillRangesAtom,
  skillRangesAtom,
} from "@/features/skills/skill-atoms";
import { optimisticTodosAtom, todosAtom } from "@/features/todos/todo-atoms";
import { ownedSquadGroupsAtom } from "@/lib/squad-builder/squad-group-atoms";

const failedResource = () => AsyncResult.fail("resource unavailable");

const expectResourceFailureToRemainFailure = (source: Atom.Atom<unknown>) => {
  const registry = AtomRegistry.make({
    initialValues: [Atom.initialValue(source, failedResource())],
  });

  const result = registry.get(source);
  expect(AsyncResult.isAsyncResult(result)).toBe(true);
  expect(
    AsyncResult.isAsyncResult(result) && AsyncResult.isFailure(result)
  ).toBe(true);
};

const expectOptimisticFailureToRemainFailure = (
  source: Atom.Atom<unknown>,
  optimistic: Atom.Atom<unknown>
) => {
  const registry = AtomRegistry.make({
    initialValues: [Atom.initialValue(source, failedResource())],
  });

  const result = registry.get(optimistic);
  expect(AsyncResult.isAsyncResult(result)).toBe(true);
  expect(
    AsyncResult.isAsyncResult(result) && AsyncResult.isFailure(result)
  ).toBe(true);
};

describe("optimistic resource failure states", () => {
  it("preserves failures for collection resources instead of returning empty data", () => {
    expectOptimisticFailureToRemainFailure(eventsAtom, optimisticEventsAtom);
    expectOptimisticFailureToRemainFailure(heroesAtom, optimisticHeroesAtom);
    expectOptimisticFailureToRemainFailure(todosAtom, optimisticTodosAtom);
    expectOptimisticFailureToRemainFailure(
      announcementsAtom,
      optimisticAnnouncementsAtom
    );
    expectResourceFailureToRemainFailure(
      paginatedBetsAtom({ eventId: 1, page: 1 })
    );
    expectOptimisticFailureToRemainFailure(
      vaultAtom({ eventId: 1 }),
      optimisticVaultAtom({ eventId: 1 })
    );
    expectOptimisticFailureToRemainFailure(
      skillRangesAtom,
      optimisticSkillRangesAtom
    );
    expectOptimisticFailureToRemainFailure(
      auctionSignupsAtom({ profession: "mage", type: "main" }),
      optimisticAuctionSignupsAtom({ profession: "mage", type: "main" })
    );
    expectResourceFailureToRemainFailure(rankingAtom({ eventId: 1 }));
    expectResourceFailureToRemainFailure(ownedSquadGroupsAtom);
  });
});
