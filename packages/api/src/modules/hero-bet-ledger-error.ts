import type { Result as BetterResultType } from "better-result";

/** Hero-bet-ledger typed result. */
export type Result<TValue, TError> = BetterResultType<TValue, TError>;

/** All expected failures for hero bet ledger operations. */
export type HeroBetLedgerError =
  | { readonly _tag: "HeroNotFound"; readonly message: string }
  | { readonly _tag: "BetNotFound"; readonly message: string }
  | { readonly _tag: "EmptyMemberUserIds"; readonly message: string }
  | { readonly _tag: "DuplicateMemberUserIds"; readonly message: string }
  | { readonly _tag: "UnverifiedMemberUserIds"; readonly message: string }
  | { readonly _tag: "NoBetsForHero"; readonly message: string }
  | { readonly _tag: "ZeroTotalPoints"; readonly message: string }
  | { readonly _tag: "BetInsertFailed"; readonly message: string }
  | { readonly _tag: "BetHasNoMembers"; readonly message: string };
