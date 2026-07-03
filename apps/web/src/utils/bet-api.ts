import { serverUrl } from "@/lib/env";

export interface BetMemberSummary {
  readonly heroBetId: number;
  readonly points: string;
  readonly userId: string;
  readonly userImage: string | null;
  readonly userName: string | null;
}
export interface BetSummary {
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly createdByImage: string | null;
  readonly createdByName: string | null;
  readonly eventId: number;
  readonly heroId: number;
  readonly heroImage: string | null;
  readonly heroLevel?: number;
  readonly heroName: string;
  readonly id: number;
  readonly memberCount: number;
  readonly members: readonly BetMemberSummary[];
}
type BetSummaryJson = Omit<BetSummary, "createdAt"> & {
  readonly createdAt: string;
};
export interface PaginatedBets {
  readonly items: readonly BetSummary[];
  readonly pagination: {
    readonly hasMore: boolean;
    readonly limit: number;
    readonly page: number;
    readonly totalItems: number;
    readonly totalPages: number;
  };
}

type PaginatedBetsJson = Omit<PaginatedBets, "items"> & {
  readonly items: readonly BetSummaryJson[];
};

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
const parseBet = (bet: BetSummaryJson): BetSummary => ({
  ...bet,
  createdAt: new Date(bet.createdAt),
});

export const betApi = {
  create: (input: {
    readonly heroId: number;
    readonly userIds: readonly string[];
  }) =>
    request<unknown>("/bet", { body: JSON.stringify(input), method: "POST" }),
  delete: (input: { readonly id: number }) =>
    request<{ readonly success: boolean }>("/bet/delete", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  edit: (input: {
    readonly betId: number;
    readonly newUserIds: readonly string[];
  }) =>
    request<{ readonly success: boolean }>("/bet/edit", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  getAllPaginated: async (input: {
    readonly eventId?: number;
    readonly heroId?: number;
    readonly limit: number;
    readonly page: number;
  }): Promise<PaginatedBets> => {
    const result = await request<PaginatedBetsJson>("/bet/paginated", {
      body: JSON.stringify(input),
      method: "POST",
    });
    return { ...result, items: result.items.map(parseBet) };
  },
  getLatestForCopy: () =>
    request<{
      readonly id: number;
      readonly members: readonly BetMemberSummary[];
    } | null>("/bet/latest-for-copy"),
  latestForCopyQueryKey: ["bet", "latestForCopy"] as const,
  paginatedQueryKey: (input: {
    readonly eventId?: number;
    readonly heroId?: number;
  }) => ["bets", "paginated", input.eventId, input.heroId] as const,
};
