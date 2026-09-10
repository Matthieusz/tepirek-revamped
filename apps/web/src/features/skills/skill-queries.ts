import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  createSkill,
  createSkillProfession,
  createSkillRange,
  deleteSkill,
  deleteSkillRange,
  getSkillRangeBySlug,
  listSkillProfessions,
  listSkillsByRange,
  listSkillRanges,
} from "@/features/skills/skill-api";
import type {
  CreateSkillInput,
  Skill,
  SkillApiRunner,
  SkillRange,
} from "@/features/skills/skill-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

const skillsQueryKey = ["skills"] as const;

/** Cache key for the complete skill-range list. */
const skillRangesQueryKey = [...skillsQueryKey, "ranges"] as const;

/** Cache key for the complete skill-profession list. */
const skillProfessionsQueryKey = [...skillsQueryKey, "professions"] as const;

/** Cache key prefix for skill-range detail queries. */
const skillRangeBySlugQueryKeyPrefix = [
  ...skillsQueryKey,
  "range-by-slug",
] as const;

/** Cache key for one skill range selected by URL slug. */
export const skillRangeBySlugQueryKey = (slug: string) =>
  [...skillRangeBySlugQueryKeyPrefix, slug] as const;

/** Cache key prefix for skill lists grouped by range. */
const skillsByRangeQueryKeyPrefix = [...skillsQueryKey, "by-range"] as const;

/** Cache key for skills belonging to one range. */
export const skillsByRangeQueryKey = (rangeId: number) =>
  [...skillsByRangeQueryKeyPrefix, rangeId] as const;

interface SkillMutationCallbacks {
  readonly onError?: (error: Error) => void;
  readonly onRefreshError?: (error: Error) => void;
}

interface RangeDeleteContext {
  readonly previousRange: SkillRange | undefined;
  readonly previousIndex: number;
}

interface SkillCacheSnapshot {
  readonly index: number;
  readonly previousSkill: Skill;
  readonly queryKey: readonly unknown[];
}

interface SkillDeleteContext {
  readonly snapshots: readonly SkillCacheSnapshot[];
}

const getRangeAtIndex = (
  ranges: readonly SkillRange[] | undefined,
  index: number
): SkillRange | undefined =>
  ranges === undefined || index < 0 || index >= ranges.length
    ? undefined
    : ranges[index];

const hasConcurrentSkillMutation = (queryClient: QueryClient): boolean =>
  queryClient
    .getMutationCache()
    .getAll()
    .filter(
      (mutation) =>
        mutation.state.status === "pending" &&
        mutation.options.mutationKey?.[0] === skillsQueryKey[0]
    ).length > 1;

const invalidateSkillQueries = async (
  queryClient: QueryClient,
  queryKeys: readonly (readonly unknown[])[],
  callbacks: SkillMutationCallbacks,
  fallback: string
): Promise<void> => {
  const results = await Promise.allSettled(
    queryKeys.map(async (queryKey) => {
      await queryClient.invalidateQueries({ queryKey }, { throwOnError: true });
    })
  );

  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );

  if (failure !== undefined) {
    callbacks.onRefreshError?.(
      failure.reason instanceof Error ? failure.reason : new Error(fallback)
    );
  }
};

const invalidateSkillQueriesAfterMutation = async (
  queryClient: QueryClient,
  queryKeys: readonly (readonly unknown[])[],
  callbacks: SkillMutationCallbacks,
  fallback: string
): Promise<void> => {
  if (hasConcurrentSkillMutation(queryClient)) {
    return;
  }

  await invalidateSkillQueries(queryClient, queryKeys, callbacks, fallback);
};

/** Returns Query options for all skill ranges. */
export const skillRangesQueryOptions = (
  runner: SkillApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) => await runner(listSkillRanges(), { signal }),
    queryKey: skillRangesQueryKey,
  });

/** Returns Query options for all skill professions. */
export const skillProfessionsQueryOptions = (
  runner: SkillApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listSkillProfessions(), { signal }),
    queryKey: skillProfessionsQueryKey,
  });

/** Returns Query options for one URL-selected skill range. */
export const skillRangeBySlugQueryOptions = (
  slug: string,
  runner: SkillApiRunner = runAppHttpApi
) => {
  const normalizedSlug = slug.trim();

  return queryOptions({
    enabled: normalizedSlug.length > 0,
    queryFn: async ({ signal }) => {
      if (normalizedSlug.length === 0) {
        return null;
      }

      return await runner(getSkillRangeBySlug(normalizedSlug), { signal });
    },
    queryKey: skillRangeBySlugQueryKey(normalizedSlug),
  });
};

/** Returns Query options for skills in one valid range. */
export const skillsByRangeQueryOptions = (
  rangeId: number,
  runner: SkillApiRunner = runAppHttpApi
) =>
  queryOptions({
    enabled: rangeId > 0,
    queryFn: async ({ signal }) => {
      if (rangeId <= 0) {
        return [];
      }

      return await runner(listSkillsByRange(rangeId), { signal });
    },
    queryKey: skillsByRangeQueryKey(rangeId),
  });

/** Returns mutation options for creating a profession. */
export const createSkillProfessionMutationOptions = (
  queryClient: QueryClient,
  runner: SkillApiRunner = runAppHttpApi,
  callbacks: SkillMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (
      payload: Parameters<typeof createSkillProfession>[0]
    ) => {
      await runner(createSkillProfession(payload));
    },
    mutationKey: [...skillsQueryKey, "mutation", "create-profession"],
    onSuccess: async () => {
      await invalidateSkillQueriesAfterMutation(
        queryClient,
        [skillProfessionsQueryKey],
        callbacks,
        "Skill professions refresh failed"
      );
    },
    retry: false,
  });

/** Returns mutation options for creating a range. */
export const createSkillRangeMutationOptions = (
  queryClient: QueryClient,
  runner: SkillApiRunner = runAppHttpApi,
  callbacks: SkillMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof createSkillRange>[0]) => {
      await runner(createSkillRange(payload));
    },
    mutationKey: [...skillsQueryKey, "mutation", "create-range"],
    onSuccess: async () => {
      await invalidateSkillQueriesAfterMutation(
        queryClient,
        [skillRangesQueryKey],
        callbacks,
        "Skill ranges refresh failed"
      );
    },
    retry: false,
  });

/** Returns mutation options for creating a skill in one range. */
export const createSkillMutationOptions = (
  queryClient: QueryClient,
  runner: SkillApiRunner = runAppHttpApi,
  callbacks: SkillMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (payload: CreateSkillInput) => {
      await runner(createSkill(payload));
    },
    mutationKey: [...skillsQueryKey, "mutation", "create-skill"],
    onSuccess: async (_skill, payload) => {
      await invalidateSkillQueriesAfterMutation(
        queryClient,
        [skillsByRangeQueryKey(payload.rangeId)],
        callbacks,
        "Skills refresh failed"
      );
    },
    retry: false,
  });

/** Returns optimistic mutation options for deleting a range. */
export const deleteSkillRangeMutationOptions = (
  queryClient: QueryClient,
  runner: SkillApiRunner = runAppHttpApi,
  callbacks: SkillMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (id: number) => {
      await runner(deleteSkillRange(id));
    },
    mutationKey: [...skillsQueryKey, "mutation", "delete-range"],
    onError: (
      error: Error,
      id: number,
      context: RangeDeleteContext | undefined
    ) => {
      const previousRange = context?.previousRange;

      if (previousRange !== undefined) {
        queryClient.setQueryData<readonly SkillRange[]>(
          skillRangesQueryKey,
          (ranges) => {
            if (
              ranges === undefined ||
              ranges.some((range) => range.id === id)
            ) {
              return ranges;
            }

            const index = Math.min(context?.previousIndex ?? 0, ranges.length);

            return [
              ...ranges.slice(0, index),
              previousRange,
              ...ranges.slice(index),
            ];
          }
        );
      }

      callbacks.onError?.(error);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: skillRangesQueryKey });

      const ranges =
        queryClient.getQueryData<readonly SkillRange[]>(skillRangesQueryKey);

      const index = ranges?.findIndex((range) => range.id === id) ?? -1;
      const previousRange = getRangeAtIndex(ranges, index);
      queryClient.setQueryData<readonly SkillRange[]>(
        skillRangesQueryKey,
        (current) => current?.filter((range) => range.id !== id)
      );

      return { previousIndex: Math.max(index, 0), previousRange };
    },
    onSettled: async () => {
      await invalidateSkillQueriesAfterMutation(
        queryClient,
        [
          skillRangesQueryKey,
          skillRangeBySlugQueryKeyPrefix,
          skillsByRangeQueryKeyPrefix,
        ],
        callbacks,
        "Skill range refresh failed"
      );
    },
    retry: false,
  });

/** Returns optimistic mutation options for deleting a skill in any range. */
export const deleteSkillMutationOptions = (
  queryClient: QueryClient,
  runner: SkillApiRunner = runAppHttpApi,
  callbacks: SkillMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (id: number) => {
      await runner(deleteSkill(id));
    },
    mutationKey: [...skillsQueryKey, "mutation", "delete-skill"],
    onError: (
      error: Error,
      id: number,
      context: SkillDeleteContext | undefined
    ) => {
      for (const snapshot of context?.snapshots ?? []) {
        queryClient.setQueryData<readonly Skill[]>(
          snapshot.queryKey,
          (skills) => {
            if (
              skills === undefined ||
              skills.some((skill) => skill.id === id)
            ) {
              return skills;
            }

            const index = Math.min(snapshot.index, skills.length);

            return [
              ...skills.slice(0, index),
              snapshot.previousSkill,
              ...skills.slice(index),
            ];
          }
        );
      }

      callbacks.onError?.(error);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({
        queryKey: skillsByRangeQueryKeyPrefix,
      });
      const snapshots: SkillCacheSnapshot[] = [];

      for (const [queryKey, skills] of queryClient.getQueriesData<
        readonly Skill[]
      >({ queryKey: skillsByRangeQueryKeyPrefix })) {
        const index = skills?.findIndex((skill) => skill.id === id) ?? -1;

        const previousSkill =
          index >= 0 && skills !== undefined ? skills[index] : undefined;

        if (previousSkill !== undefined) {
          snapshots.push({
            index: Math.max(index, 0),
            previousSkill,
            queryKey,
          });
        }

        queryClient.setQueryData<readonly Skill[]>(queryKey, (current) =>
          current?.filter((skill) => skill.id !== id)
        );
      }

      return { snapshots };
    },
    onSettled: async () => {
      await invalidateSkillQueriesAfterMutation(
        queryClient,
        [skillsByRangeQueryKeyPrefix],
        callbacks,
        "Skills refresh failed"
      );
    },
    retry: false,
  });
