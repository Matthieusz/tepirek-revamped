import { describe, expect, it } from "vitest";

import {
  deleteSkillFromRangeAtom,
  optimisticSkillRangesAtom,
  optimisticSkillsByRangeAtom,
  skillProfessionsAtom,
  skillRangeBySlugAtom,
  skillRangesAtom,
  skillsByRangeAtom,
} from "@/lib/skill-atoms";
import { makeTestLayer, flush } from "@/lib/test-utils/atom-test-utils";

describe("skill atoms", () => {
  describe("resource atoms produce distinct family members per key", () => {
    it("skillsByRangeAtom returns distinct atoms for different range IDs", () => {
      const atomA = skillsByRangeAtom(1);
      const atomB = skillsByRangeAtom(2);
      const atomAagain = skillsByRangeAtom(1);

      expect(atomA).not.toBe(atomB);
      expect(atomA).toBe(atomAagain);
    });

    it("deleteSkillFromRangeAtom returns distinct atoms for different range IDs", () => {
      const atomA = deleteSkillFromRangeAtom(1);
      const atomB = deleteSkillFromRangeAtom(2);
      const atomAagain = deleteSkillFromRangeAtom(1);

      expect(atomA).not.toBe(atomB);
      expect(atomA).toBe(atomAagain);
    });

    it("skillRangeBySlugAtom returns distinct atoms for different slugs", () => {
      const atomA = skillRangeBySlugAtom("range-a");
      const atomB = skillRangeBySlugAtom("range-b");
      const atomAagain = skillRangeBySlugAtom("range-a");

      expect(atomA).not.toBe(atomB);
      expect(atomA).toBe(atomAagain);
    });

    it("optimisticSkillsByRangeAtom returns distinct atoms for different range IDs", () => {
      const atomA = optimisticSkillsByRangeAtom(1);
      const atomB = optimisticSkillsByRangeAtom(5);
      const atomAagain = optimisticSkillsByRangeAtom(1);

      expect(atomA).not.toBe(atomB);
      expect(atomA).toBe(atomAagain);
    });
  });

  describe("global resource atoms mount without error", () => {
    it("skillRangesAtom can be mounted and returns a Result", () => {
      const { makeRegistry } = makeTestLayer();
      const registry = makeRegistry();

      registry.mount(skillRangesAtom);
      const value = registry.get(skillRangesAtom);

      expect(value).toBeDefined();
    });

    it("skillProfessionsAtom can be mounted and returns a Result", () => {
      const { makeRegistry } = makeTestLayer();
      const registry = makeRegistry();

      registry.mount(skillProfessionsAtom);
      const value = registry.get(skillProfessionsAtom);

      expect(value).toBeDefined();
    });

    it("optimisticSkillRangesAtom can be mounted and returns a value", () => {
      const { makeRegistry } = makeTestLayer();
      const registry = makeRegistry();

      registry.mount(skillRangesAtom);
      registry.mount(optimisticSkillRangesAtom);
      const value = registry.get(optimisticSkillRangesAtom);

      expect(value).toBeDefined();
    });
  });

  describe("skillsByRangeAtom mounts real API resource only when called", () => {
    it("skips API call for rangeId 0 when never mounted", async () => {
      const { calls, makeRegistry } = makeTestLayer();
      const registry = makeRegistry();

      registry.mount(skillsByRangeAtom(5));
      await flush();

      const callsForRange5 = calls.filter(
        (c) =>
          c.method === "listSkillsByRange" &&
          (c.args as { readonly rangeId?: number })?.rangeId === 5
      );
      expect(callsForRange5).toHaveLength(1);

      const callsForRange0 = calls.filter(
        (c) =>
          c.method === "listSkillsByRange" &&
          (c.args as { readonly rangeId?: number })?.rangeId === 0
      );
      expect(callsForRange0).toHaveLength(0);
    });

    it("mounted skillsByRangeAtom(0) does trigger an API call (no disabled-atom shortcut)", async () => {
      const { calls, makeRegistry } = makeTestLayer();
      const registry = makeRegistry();

      registry.mount(skillsByRangeAtom(0));
      await flush();

      const callsForRange0 = calls.filter(
        (c) =>
          c.method === "listSkillsByRange" &&
          (c.args as { readonly rangeId?: number })?.rangeId === 0
      );
      expect(callsForRange0).toHaveLength(1);
    });
  });

  describe("deleteSkillFromRangeAtom exists and has correct type shape", () => {
    it("can be called with a number and returns an atom", () => {
      const atom = deleteSkillFromRangeAtom(1);
      expect(atom).toBeDefined();
    });
  });
});
