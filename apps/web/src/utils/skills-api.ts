import { serverUrl } from "@/lib/env";

export interface ProfessionSummary {
  readonly id: number;
  readonly name: string;
}
export interface RangeSummary {
  readonly id: number;
  readonly image: string | null;
  readonly level: number;
  readonly name: string;
  readonly slug: string;
}
export interface SkillSummary {
  readonly addedBy: string | null;
  readonly addedByImage: string | null;
  readonly id: number;
  readonly link: string;
  readonly mastery: boolean;
  readonly name: string;
  readonly professionId: number;
  readonly professionName: string;
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

export const skillsApi = {
  createProfession: (input: { readonly name: string }) =>
    request<undefined>("/skills/professions", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  createRange: (input: {
    readonly image: string;
    readonly level: number;
    readonly name: string;
  }) =>
    request<undefined>("/skills/ranges", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  createSkill: (input: {
    readonly link: string;
    readonly mastery: boolean;
    readonly name: string;
    readonly professionId: number;
    readonly rangeId: number;
  }) =>
    request<undefined>("/skills", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  deleteRange: (input: { readonly id: number }) =>
    request<undefined>("/skills/ranges/delete", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  deleteSkill: (input: { readonly id: number }) =>
    request<undefined>("/skills/delete", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  getRangeBySlug: (input: { readonly slug: string }) =>
    request<RangeSummary | null>("/skills/ranges/by-slug", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  listProfessions: () =>
    request<readonly ProfessionSummary[]>("/skills/professions"),
  listRanges: () => request<readonly RangeSummary[]>("/skills/ranges"),
  listSkillsByRange: (input: { readonly rangeId: number }) =>
    request<readonly SkillSummary[]>("/skills/by-range", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  professionsQueryKey: ["skills", "professions"] as const,
  rangeBySlugQueryKey: (slug: string) => ["skills", "range", slug] as const,
  rangesQueryKey: ["skills", "ranges"] as const,
  skillsByRangeQueryKey: (rangeId: number) =>
    ["skills", "range", rangeId, "skills"] as const,
};
