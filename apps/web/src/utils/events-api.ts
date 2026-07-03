import { serverUrl } from "@/lib/env";

export interface EventSummary {
  readonly active: boolean | null;
  readonly color: string;
  readonly endTime: Date;
  readonly icon: string;
  readonly id: number;
  readonly name: string;
}

type EventSummaryJson = Omit<EventSummary, "endTime"> & {
  readonly endTime: string;
};

const parseEvent = (event: EventSummaryJson): EventSummary => ({
  ...event,
  endTime: new Date(event.endTime),
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
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return undefined as A;
  }

  return response.json() as Promise<A>;
};

export const eventsApi = {
  create: (input: {
    readonly color?: string;
    readonly endTime: string;
    readonly icon?: string;
    readonly name: string;
  }) =>
    request<undefined>("/events", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  delete: (input: { readonly id: number }) =>
    request<undefined>("/events/delete", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  list: async () => {
    const events = await request<readonly EventSummaryJson[]>("/events");

    return events.map(parseEvent);
  },
  queryKey: ["events"] as const,
  toggleActive: (input: { readonly active: boolean; readonly id: number }) =>
    request<undefined>("/events/toggle-active", {
      body: JSON.stringify(input),
      method: "POST",
    }),
};
