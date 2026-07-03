import { serverUrl } from "@/lib/env";

export interface TodoSummary {
  readonly completed: boolean;
  readonly id: number;
  readonly text: string;
  readonly userId: string;
}

const request = async <A>(path: string, init?: RequestInit): Promise<A> => {
  const response = await fetch(`${serverUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
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

export const todoApi = {
  create: (input: { readonly text: string }) =>
    request<undefined>("/todos", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  delete: (input: { readonly id: number }) =>
    request<undefined>("/todos/delete", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  list: () => request<readonly TodoSummary[]>("/todos"),
  queryKey: ["todos"] as const,
  toggle: (input: { readonly completed: boolean; readonly id: number }) =>
    request<undefined>("/todos/toggle", {
      body: JSON.stringify(input),
      method: "POST",
    }),
};
