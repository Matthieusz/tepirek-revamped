import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import { SkillSummary } from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import * as Schema from "effect/Schema";
import { describe, expect, it, vi } from "vitest";

import type { Skill, SkillApiRunner } from "@/features/skills/skill-api";
import {
  createSkillRangeMutationOptions,
  deleteSkillMutationOptions,
  skillRangeBySlugQueryKey,
  skillRangeBySlugQueryOptions,
  skillsByRangeQueryKey,
  skillsByRangeQueryOptions,
  skillRangesQueryOptions,
} from "@/features/skills/skill-queries";
import { makeAppHttpApiRunner } from "@/lib/http-api-client-runtime";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

const makeSkill = (id: number): Skill =>
  Schema.decodeSync(SkillSummary)({
    addedBy: "user-1",
    addedByImage: null,
    id,
    link: `https://example.com/${id}`,
    mastery: false,
    name: `Skill ${id}`,
    professionId: 1,
    professionName: "Mage",
  });

interface Deferred<A> {
  readonly promise: Promise<A>;
  readonly resolve: (value: A) => void;
}

const deferred = <A>(): Deferred<A> => {
  let resolvePromise: (value: A) => void;

  // oxlint-disable-next-line promise/avoid-new -- tests need manually controlled responses
  const promise = new Promise<A>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value) => {
      resolvePromise(value);
    },
  };
};

describe("skill queries and mutations", () => {
  it("keeps direct range navigation and missing slugs explicit", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();

    try {
      await expect(
        testClient.queryClient.query(skillRangesQueryOptions(runner))
      ).resolves.toEqual([]);
      await expect(
        testClient.queryClient.query(
          skillRangeBySlugQueryOptions("missing", runner)
        )
      ).resolves.toBeNull();
      await testClient.queryClient.query(skillsByRangeQueryOptions(0, runner));

      expect(calls).toContainEqual({
        args: { slug: "missing" },
        group: "skills",
        method: "getRangeBySlug",
      });
      expect(calls.some((call) => call.method === "listSkillsByRange")).toBe(
        false
      );
      expect(skillRangeBySlugQueryKey("missing")).toEqual([
        "skills",
        "range-by-slug",
        "missing",
      ]);
      expect(skillsByRangeQueryKey(0)).toEqual(["skills", "by-range", 0]);
    } finally {
      testClient.cleanup();
    }
  });

  it("invalidates the range list after creating a range", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runner = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();

    const observer = new QueryObserver(
      testClient.queryClient,
      skillRangesQueryOptions(runner)
    );

    const unsubscribe = observer.subscribe(() => {});

    try {
      await observer.refetch();

      const mutation = new MutationObserver(
        testClient.queryClient,
        createSkillRangeMutationOptions(testClient.queryClient, runner)
      );

      await mutation.mutate({ image: "image", level: 30, name: "Range" });

      expect(calls.filter((call) => call.method === "listRanges")).toHaveLength(
        2
      );
      mutation.reset();
    } finally {
      unsubscribe();
      testClient.cleanup();
    }
  });

  it("optimistically removes a skill and restores it after failure", async () => {
    const skill = makeSkill(1);
    const failure = deferred<null>();

    const failingRunner: SkillApiRunner = async () => {
      await failure.promise;
      throw new Error("Skill request failed");
    };

    const testClient = makeTestQueryClient();
    const queryKey = skillsByRangeQueryKey(10);
    testClient.queryClient.setQueryData(queryKey, [skill]);

    try {
      const mutation = new MutationObserver(
        testClient.queryClient,
        deleteSkillMutationOptions(testClient.queryClient, failingRunner)
      );

      const request = mutation.mutate(skill.id);

      await vi.waitFor(() => {
        expect(testClient.queryClient.getQueryData(queryKey)).toEqual([]);
      });
      failure.resolve(null);
      await expect(request).rejects.toThrow("Skill request failed");
      expect(testClient.queryClient.getQueryData(queryKey)).toEqual([skill]);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });
});
