import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";

import { serverUrl } from "@/lib/env";

export interface AuctionGroupInput {
  readonly profession: AuctionProfession;
  readonly type: AuctionType;
}
export type AuctionSignupInput = AuctionGroupInput & {
  readonly column: number;
  readonly level: number;
  readonly round: number;
};
export interface AuctionSignupSummary {
  readonly column: number;
  readonly createdAt: Date;
  readonly id: number;
  readonly level: number;
  readonly round: number;
  readonly userId: string;
  readonly userImage: string | null;
  readonly userName: string | null;
}
export interface AuctionStats {
  readonly totalSignups: number;
  readonly uniqueUsers: number;
}

type AuctionSignupJson = Omit<AuctionSignupSummary, "createdAt"> & {
  readonly createdAt: string;
};
const parseSignup = (signup: AuctionSignupJson): AuctionSignupSummary => ({
  ...signup,
  createdAt: new Date(signup.createdAt),
});

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

export const auctionApi = {
  getSignups: async (input: AuctionGroupInput) => {
    const signups = await request<readonly AuctionSignupJson[]>(
      "/auction/signups",
      {
        body: JSON.stringify(input),
        method: "POST",
      }
    );

    return signups.map(parseSignup);
  },
  getStats: (input: AuctionGroupInput) =>
    request<AuctionStats>("/auction/stats", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  removeSignup: (input: { readonly id: number }) =>
    request<{ readonly success: true }>("/auction/signups/remove", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  signupsQueryKey: (input: AuctionGroupInput) =>
    ["auction", "signups", input.type, input.profession] as const,
  statsQueryKey: (input: AuctionGroupInput) =>
    ["auction", "stats", input.type, input.profession] as const,
  toggleSignup: (input: AuctionSignupInput) =>
    request<{ readonly action: "added" | "removed" }>(
      "/auction/signups/toggle",
      { body: JSON.stringify(input), method: "POST" }
    ),
};
