import { FormAtoms, FormBuilder } from "@lucas-barake/effect-form";
import * as Effect from "effect/Effect";
import * as Latch from "effect/Latch";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { describe, expect, it, vi } from "vitest";

const flushFibers = async (): Promise<void> => {
  await Effect.runPromise(Effect.yieldNow);
  await Promise.resolve();
};

const nameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj nazwę",
  })
);

class ProviderFailure extends Schema.TaggedErrorClass<ProviderFailure>()(
  "ProviderFailure",
  { reason: Schema.String }
) {}

const formBuilder = FormBuilder.empty.addField("name", nameSchema);

const makeForm = (
  onSubmit: (name: string) => Effect.Effect<string, Error>
): FormAtoms.FormAtoms<typeof formBuilder.fields, never, string, Error, void> =>
  FormAtoms.make({
    formBuilder,
    mode: { validation: "onSubmit" },
    onSubmit: (_, { decoded }) => onSubmit(decoded.name),
    runtime: Atom.runtime(Layer.empty),
  });

type Form = ReturnType<typeof makeForm>;

const initialize = (
  form: Form,
  defaultName: string
): AtomRegistry.AtomRegistry => {
  const registry = AtomRegistry.make();
  registry.mount(form.mountAtom);
  registry.set(
    form.stateAtom,
    Option.some(form.operations.createInitialState({ name: defaultName }))
  );
  return registry;
};

const dispose = (registry: AtomRegistry.AtomRegistry): void => {
  registry.dispose();
};

describe("Effect Form submission lifecycle", () => {
  it("routes validation errors to fields and does not call the mutation", async () => {
    const submit = vi.fn(() => Effect.succeed("created"));
    const form = makeForm(() => submit());
    const registry = initialize(form, "");

    registry.set(form.submitAtom, undefined);
    await flushFibers();

    expect(submit).not.toHaveBeenCalled();
    expect(AsyncResult.isFailure(registry.get(form.submitAtom))).toBe(true);
    const fieldError = registry.get(
      form.getFieldAtoms(form.fieldRefs.name).error
    );
    expect(Option.isSome(fieldError)).toBe(true);
    if (Option.isSome(fieldError)) {
      expect(fieldError.value).toBe("Podaj nazwę");
    }

    dispose(registry);
  });

  it("exposes a waiting state and records values only after success", async () => {
    const latch = Latch.makeUnsafe();
    const form = makeForm(() => latch.await.pipe(Effect.as("created")));
    const registry = initialize(form, "initial");
    const name = form.getFieldAtoms(form.fieldRefs.name);
    registry.set(name.setValue, "submitted");

    registry.set(form.submitAtom, undefined);
    await flushFibers();
    expect(registry.get(form.submitAtom).waiting).toBe(true);

    latch.openUnsafe();
    await flushFibers();

    const result = registry.get(form.submitAtom);
    expect(AsyncResult.isSuccess(result)).toBe(true);
    expect(registry.get(form.valuesAtom)).toEqual(
      Option.some({ name: "submitted" })
    );
    const lastSubmitted = registry.get(form.lastSubmittedValuesAtom);
    expect(Option.isSome(lastSubmitted)).toBe(true);
    if (Option.isSome(lastSubmitted)) {
      expect(lastSubmitted.value.encoded).toEqual({ name: "submitted" });
    }

    dispose(registry);
  });

  it("keeps failed values open and does not mark them as submitted", async () => {
    const form = makeForm(() =>
      Effect.fail(new ProviderFailure({ reason: "provider failed" }))
    );
    const registry = initialize(form, "initial");
    const name = form.getFieldAtoms(form.fieldRefs.name);
    registry.set(name.setValue, "unsaved");

    registry.set(form.submitAtom, undefined);
    await flushFibers();

    expect(AsyncResult.isFailure(registry.get(form.submitAtom))).toBe(true);
    expect(registry.get(form.submitAtom).waiting).toBe(false);
    expect(registry.get(form.valuesAtom)).toEqual(
      Option.some({ name: "unsaved" })
    );
    expect(Option.isNone(registry.get(form.lastSubmittedValuesAtom))).toBe(
      true
    );

    registry.set(form.resetAtom, undefined);
    expect(registry.get(form.valuesAtom)).toEqual(
      Option.some({ name: "initial" })
    );

    dispose(registry);
  });

  it("reinitializes with new defaults instead of retaining stale values", () => {
    const form = makeForm(() => Effect.succeed("created"));
    const registry = initialize(form, "first default");
    const name = form.getFieldAtoms(form.fieldRefs.name);
    registry.set(name.setValue, "stale value");

    registry.set(
      form.stateAtom,
      Option.some(
        form.operations.createInitialState({ name: "second default" })
      )
    );

    expect(registry.get(form.valuesAtom)).toEqual(
      Option.some({ name: "second default" })
    );
    dispose(registry);
  });
});
