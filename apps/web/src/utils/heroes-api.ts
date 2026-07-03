import { serverUrl } from "@/lib/env";

export interface HeroSummary {
  readonly eventId: number;
  readonly id: number;
  readonly image: string | null;
  readonly level: number;
  readonly name: string;
  readonly pointWorth: string;
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
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return undefined as A;
  }

  return response.json() as Promise<A>;
};

export const heroesApi = {
  byEventQueryKey: (eventId: number) =>
    ["heroes", "by-event", eventId] as const,
  create: (input: {
    readonly eventId: number;
    readonly image?: string;
    readonly level?: number;
    readonly name: string;
  }) =>
    request<undefined>("/heroes", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  delete: (input: { readonly id: number }) =>
    request<undefined>("/heroes/delete", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  list: () => request<readonly HeroSummary[]>("/heroes"),
  listByEvent: (input: { readonly eventId: number }) =>
    request<readonly HeroSummary[]>("/heroes/by-event", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  queryKey: ["heroes"] as const,
};
