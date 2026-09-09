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
  readonly data: HeroStats | undefined;
  readonly enabled: boolean;
  readonly isError: boolean;
  readonly isLoading: boolean;
  readonly onRetry: () => void;
}): HeroStatsPreviewState => {
  if (!params.enabled) {
    return { _tag: "hidden" };
  }
  if (params.isError) {
    return { _tag: "failure", onRetry: params.onRetry };
  }
  if (params.isLoading) {
    return { _tag: "loading" };
  }
  if (params.data === undefined) {
    return { _tag: "empty" };
  }
  return { _tag: "success", heroStats: params.data };
};
