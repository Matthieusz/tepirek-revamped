import { serverUrl } from "@/lib/env";

export interface VaultRow {
  readonly paidOut: boolean;
  readonly totalEarnings: string;
  readonly userId: string;
  readonly userImage: string | null;
  readonly userName: string | null;
}
export interface DistributeGoldSuccess {
  readonly goldAmount: number;
  readonly heroId: number;
  readonly heroName: string;
  readonly pointWorth: number;
  readonly success: boolean;
  readonly totalPoints: number;
  readonly usersUpdated: number;
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

export const vaultApi = {
  distributeGold: (input: {
    readonly goldAmount: number;
    readonly heroId: number;
  }) =>
    request<DistributeGoldSuccess>("/vault/distribute-gold", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  getVault: (input: { readonly eventId?: number }) =>
    request<readonly VaultRow[]>("/vault", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  togglePaidOut: (input: {
    readonly eventId: number;
    readonly paidOut: boolean;
    readonly userId: string;
  }) =>
    request<{ readonly success: boolean }>("/vault/toggle-paid-out", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  vaultQueryKey: (input: { readonly eventId?: number }) =>
    ["vault", input.eventId] as const,
};
