import { serverUrl } from "@/lib/env";

interface AnnouncementUser {
  readonly id: string;
  readonly image: string | null;
  readonly name: string | null;
}

export interface AnnouncementSummary {
  readonly createdAt: Date;
  readonly description: string;
  readonly id: number;
  readonly title: string;
  readonly user: AnnouncementUser | null;
}

type AnnouncementSummaryJson = Omit<AnnouncementSummary, "createdAt"> & {
  readonly createdAt: string;
};

const parseAnnouncement = (
  announcement: AnnouncementSummaryJson
): AnnouncementSummary => ({
  ...announcement,
  createdAt: new Date(announcement.createdAt),
});

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

export const announcementApi = {
  create: (input: { readonly description: string; readonly title: string }) =>
    request<undefined>("/announcements", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  delete: (input: { readonly id: number }) =>
    request<undefined>("/announcements/delete", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  list: async () => {
    const announcements =
      await request<readonly AnnouncementSummaryJson[]>("/announcements");

    return announcements.map(parseAnnouncement);
  },
  queryKey: ["announcements"] as const,
};
