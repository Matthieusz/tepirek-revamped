import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
} from "@/features/announcements/announcement-api";
import type {
  Announcement,
  AnnouncementApiRunner,
  DeleteAnnouncementInput,
} from "@/features/announcements/announcement-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Shared cache key for announcements visible to the current user. */
export const announcementsQueryKey = ["announcements"] as const;

type AnnouncementMutationError = Error;

interface AnnouncementMutationCallbacks {
  readonly onError?: (error: AnnouncementMutationError) => void;
  readonly onRefreshError?: (error: AnnouncementMutationError) => void;
}

interface DeleteAnnouncementContext {
  readonly previousAnnouncement: Announcement | undefined;
  readonly previousIndex: number;
}

const invalidateAnnouncements = async (
  queryClient: QueryClient,
  callbacks: AnnouncementMutationCallbacks
): Promise<void> => {
  try {
    await queryClient.invalidateQueries(
      { queryKey: announcementsQueryKey },
      { throwOnError: true }
    );
  } catch (error: unknown) {
    callbacks.onRefreshError?.(
      error instanceof Error ? error : new Error("Announcement refresh failed")
    );
  }
};

const hasConcurrentAnnouncementMutation = (queryClient: QueryClient): boolean =>
  queryClient
    .getMutationCache()
    .getAll()
    .filter(
      (mutation) =>
        mutation.state.status === "pending" &&
        mutation.options.mutationKey?.[0] === announcementsQueryKey[0]
    ).length > 1;

const invalidateAnnouncementsAfterMutation = async (
  queryClient: QueryClient,
  callbacks: AnnouncementMutationCallbacks
): Promise<void> => {
  if (hasConcurrentAnnouncementMutation(queryClient)) {
    return;
  }

  await invalidateAnnouncements(queryClient, callbacks);
};

/** Returns Query options for announcements visible to the current user. */
export const announcementsQueryOptions = (
  runner: AnnouncementApiRunner = runAppHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) =>
      await runner(listAnnouncements(), { signal }),
    queryKey: announcementsQueryKey,
  });

/** Returns mutation options for creating an announcement. */
export const createAnnouncementMutationOptions = (
  queryClient: QueryClient,
  runner: AnnouncementApiRunner = runAppHttpApi,
  callbacks: AnnouncementMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof createAnnouncement>[0]) => {
      await runner(createAnnouncement(payload));
    },
    mutationKey: announcementsQueryKey,
    onError: (error: AnnouncementMutationError) => {
      callbacks.onError?.(error);
    },
    onSuccess: async () => {
      await invalidateAnnouncements(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns optimistic mutation options for deleting an announcement. */
export const deleteAnnouncementMutationOptions = (
  queryClient: QueryClient,
  runner: AnnouncementApiRunner = runAppHttpApi,
  callbacks: AnnouncementMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: DeleteAnnouncementInput) => {
      await runner(deleteAnnouncement(input));
    },
    mutationKey: announcementsQueryKey,
    onError: (
      error: AnnouncementMutationError,
      input: DeleteAnnouncementInput,
      context: DeleteAnnouncementContext | undefined
    ) => {
      const previousAnnouncement = context?.previousAnnouncement;

      if (previousAnnouncement !== undefined) {
        queryClient.setQueryData<readonly Announcement[]>(
          announcementsQueryKey,
          (announcements) => {
            if (
              announcements === undefined ||
              announcements.some((announcement) => announcement.id === input.id)
            ) {
              return announcements;
            }

            const previousIndex = Math.min(
              context?.previousIndex ?? 0,
              announcements.length
            );

            return [
              ...announcements.slice(0, previousIndex),
              previousAnnouncement,
              ...announcements.slice(previousIndex),
            ];
          }
        );
      }

      callbacks.onError?.(error);
    },
    onMutate: async (input: DeleteAnnouncementInput) => {
      await queryClient.cancelQueries({ queryKey: announcementsQueryKey });

      const announcements = queryClient.getQueryData<readonly Announcement[]>(
        announcementsQueryKey
      );

      const previousIndex =
        announcements?.findIndex(
          (announcement) => announcement.id === input.id
        ) ?? -1;

      const previousAnnouncement =
        previousIndex >= 0 && announcements !== undefined
          ? announcements[previousIndex]
          : undefined;

      queryClient.setQueryData<readonly Announcement[]>(
        announcementsQueryKey,
        (current) =>
          current?.filter((announcement) => announcement.id !== input.id)
      );

      return {
        previousAnnouncement,
        previousIndex: Math.max(previousIndex, 0),
      };
    },
    onSettled: async () => {
      await invalidateAnnouncementsAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });
