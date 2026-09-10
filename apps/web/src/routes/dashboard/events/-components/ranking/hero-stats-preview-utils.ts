import * as Data from "effect/Data";

export interface HeroStats {
  readonly heroId: number;
  readonly heroName: string;
  readonly currentPointWorth: number;
  readonly totalBets: number;
  readonly totalPoints: number;
}

export type HeroStatsPreviewState = Data.TaggedEnum<{
  readonly hidden: Record<never, never>;
  readonly loading: Record<never, never>;
  readonly failure: { readonly onRetry: () => void };
  readonly empty: Record<never, never>;
  readonly success: { readonly heroStats: HeroStats };
}>;

export const HeroStatsPreviewState = Data.taggedEnum<HeroStatsPreviewState>();

export const getHeroStatsPreviewState = (params: {
  readonly data: HeroStats | undefined;
  readonly enabled: boolean;
  readonly isError: boolean;
  readonly isLoading: boolean;
  readonly onRetry: () => void;
}): HeroStatsPreviewState => {
  if (!params.enabled) {
    return HeroStatsPreviewState.hidden();
  }

  if (params.isError) {
    return HeroStatsPreviewState.failure({ onRetry: params.onRetry });
  }

  if (params.isLoading) {
    return HeroStatsPreviewState.loading();
  }

  if (params.data === undefined) {
    return HeroStatsPreviewState.empty();
  }

  return HeroStatsPreviewState.success({ heroStats: params.data });
};
