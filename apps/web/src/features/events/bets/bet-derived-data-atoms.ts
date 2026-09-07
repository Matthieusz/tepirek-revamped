import * as Atom from "effect/unstable/reactivity/Atom";

import {
  heroStatsAtom,
  oldestUnpaidEventAtom,
  rankingAtom,
} from "@/features/events/ranking/ranking-atoms";
import { vaultAtom } from "@/features/events/vault/vault-atoms";

import type { BetDerivedDataInput } from "./bet-queries";

/**
 * Temporary bridge for derived event resources that are migrated in issue #58.
 * Bet mutations call this while ranking and vault still use Effect Atom.
 */
export const refreshBetDerivedDataAtom = Atom.fnSync(
  (input: BetDerivedDataInput, get) => {
    get.refresh(rankingAtom({}));
    if (input.eventId !== undefined) {
      get.refresh(rankingAtom({ eventId: input.eventId }));
      get.refresh(
        rankingAtom({ eventId: input.eventId, heroId: input.heroId })
      );
    }
    get.refresh(rankingAtom({ heroId: input.heroId }));
    get.refresh(heroStatsAtom({ heroId: input.heroId }));
    get.refresh(oldestUnpaidEventAtom);
    get.refresh(vaultAtom({}));
    if (input.eventId !== undefined) {
      get.refresh(vaultAtom({ eventId: input.eventId }));
    }
  }
);
