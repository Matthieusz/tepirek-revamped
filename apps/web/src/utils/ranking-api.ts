import { serverUrl } from "@/lib/env";

export interface HeroStats {
  readonly currentPointWorth: number;
  readonly heroId: number;
  readonly heroName: string;
  readonly totalBets: number;
  readonly totalPoints: number;
}
export interface RankingRow {
  readonly totalBets: number;
  readonly totalEarnings: string;
  readonly totalPoints: string;
  readonly userId: string;
  readonly userImage: string | null;
  readonly userName: string | null;
}
export interface RankingResult {
  readonly pointWorth: number | null;
  readonly ranking: readonly RankingRow[];
  readonly totalBets: number;
}

const request = async <A>(path: string, init?: RequestInit): Promise<A> => {
  const response = await fetch(`${serverUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<A>;
};

export const rankingApi = {
  getHeroStats: (input: { readonly heroId: number }) =>
    request<HeroStats>("/ranking/hero-stats", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  getOldestUnpaidEvent: () =>
    request<number | null>("/ranking/oldest-unpaid-event"),
  getRanking: (input: {
    readonly eventId?: number;
    readonly heroId?: number;
  }) =>
    request<RankingResult>("/ranking", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  heroStatsQueryKey: (input: { readonly heroId: number }) =>
    ["ranking", "heroStats", input.heroId] as const,
  oldestUnpaidEventQueryKey: ["ranking", "oldestUnpaidEvent"] as const,
  rankingQueryKey: (input: {
    readonly eventId?: number;
    readonly heroId?: number;
  }) => ["ranking", input.eventId, input.heroId] as const,
};
