import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

export interface HeroStats {
  readonly heroId: number;
  readonly heroName: string;
  readonly currentPointWorth: number;
  readonly totalBets: number;
  readonly totalPoints: number;
}

export type HeroStatsPreviewState =
  | { readonly _tag: "hidden" }
  | { readonly _tag: "loading" }
  | { readonly _tag: "failure"; readonly onRetry: () => void }
  | { readonly _tag: "empty" }
  | { readonly _tag: "success"; readonly heroStats: HeroStats };

export const getHeroStatsPreviewState = (params: {
  readonly enabled: boolean;
  readonly onRetry: () => void;
  readonly result: AsyncResult.AsyncResult<HeroStats | undefined, unknown>;
}): HeroStatsPreviewState => {
  if (!params.enabled) {
    return { _tag: "hidden" };
  }
  if (AsyncResult.isFailure(params.result)) {
    return { _tag: "failure", onRetry: params.onRetry };
  }
  if (!AsyncResult.isSuccess(params.result)) {
    return { _tag: "loading" };
  }
  if (params.result.value === undefined) {
    return { _tag: "empty" };
  }
  return { _tag: "success", heroStats: params.result.value };
};
