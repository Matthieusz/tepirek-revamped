// @vitest-environment happy-dom

import type { AnyFormApi } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback, useCanCloseForm } from "@/components/forms/form";
import { useFormContext } from "@/components/forms/form-context";
import { FormFieldError } from "@/components/forms/form-field-helpers";
import { FormSubmissionError } from "@/lib/form-submission";

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

const FormContextProbe = () => {
  const form = useFormContext();
  const canClose = useCanCloseForm(form.state.isSubmitting);

  return (
    <>
      <output>{canClose() ? "can-close" : "submitting"}</output>
      <FormFieldError error="Błąd" id="field-name-error" />
    </>
  );
};

const NameSchema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.refine((value): value is string => value.trim().length > 0, {
      message: "Podaj nazwę",
    })
  ),
});
const NameValidator = Schema.toStandardSchemaV1(NameSchema);

type TestFormProps = {
  readonly defaultName?: string;
  readonly onForm?: (form: AnyFormApi) => void;
  readonly onSubmit?: (name: string) => void | Promise<void>;
};

const TestForm = ({
  defaultName = "Ala",
  onForm,
  onSubmit = async () => undefined,
}: TestFormProps) => {
  const form = useAppForm({
    defaultValues: { name: defaultName },
    onSubmit: async ({ value }) => onSubmit(value.name),
    validators: { onSubmit: NameValidator },
  });
  useEffect(() => {
    form.reset({ name: defaultName });
  }, [defaultName, form]);
  useEffect(() => {
    onForm?.(form);
  }, [form, onForm]);

  return (
    <form.AppForm>
      <FormContextProbe />
      <Form form={form}>
        <form.AppField name="name">
          {(field) => <field.TextField label="Nazwa" />}
        </form.AppField>
      </Form>
    </form.AppForm>
  );
};

const renderTestForm = async (element: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
  });
  return { container, root };
};

describe("TanStack app form", () => {
  it("renders a shared bound field with its initial value", () => {
    const markup = renderToStaticMarkup(<TestForm />);

    expect(markup).toContain("noValidate");
    expect(markup).toContain('name="name"');
    expect(markup).toContain('value="Ala"');
    expect(markup).toContain('for="field-name"');
  });

  it("focuses the first invalid control after submission", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    let form: AnyFormApi | undefined;
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TestForm defaultName="" onForm={(value) => (form = value)} />
      );
    });
    await act(async () => {
      await form?.handleSubmit();
    });

    expect(container.innerHTML).toContain('aria-invalid="true"');
    expect(document.activeElement?.id).toBe("field-name");
    root.unmount();
  });

  it("replaces stale values when the default prop changes", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    let form: AnyFormApi | undefined;
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TestForm defaultName="Ala" onForm={(value) => (form = value)} />
      );
    });
    form?.setFieldValue("name", "stale");

    await act(async () => {
      root.render(
        <TestForm defaultName="Ola" onForm={(value) => (form = value)} />
      );
    });

    expect(form?.state.values).toEqual({ name: "Ola" });
    root.unmount();
  });

  it("renders typed mutation feedback separately from field failures", () => {
    const failure = new FormSubmissionError({
      cause: new Error("Nie udało się"),
      message: "Nie udało się",
    });

    expect(renderToStaticMarkup(<FormFeedback failure={failure} />)).toContain(
      "Nie udało się"
    );
  });

  it("routes Effect Schema messages to fields and blocks submission", async () => {
    let form: AnyFormApi | undefined;
    const submit = vi.fn();
    const { root } = await renderTestForm(
      <TestForm onForm={(value) => (form = value)} onSubmit={submit} />
    );

    form?.setFieldValue("name", "");
    await form?.handleSubmit();

    expect(submit).not.toHaveBeenCalled();
    expect(form?.state.fieldMeta.name?.errors).toEqual([
      expect.objectContaining({ message: "Podaj nazwę" }),
    ]);
    root.unmount();
  });

  it("keeps draft values after a failed mutation and resets after success", async () => {
    let form: AnyFormApi | undefined;
    const mutation = vi
      .fn<(name: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("provider failed"))
      .mockResolvedValueOnce();
    const { root } = await renderTestForm(
      <TestForm
        onForm={(value) => (form = value)}
        onSubmit={(name) => mutation(name)}
      />
    );

    form?.setFieldValue("name", "unsaved");
    await expect(form?.handleSubmit()).rejects.toThrow("provider failed");
    expect(form?.state.values).toEqual({ name: "unsaved" });

    await form?.handleSubmit();
    form?.reset();
    expect(form?.state.values).toEqual({ name: "Ala" });
    expect(mutation).toHaveBeenCalledTimes(2);
    root.unmount();
  });

  it("preserves transformed values in the application submit handler", async () => {
    const validator = Schema.toStandardSchemaV1(
      Schema.Struct({
        id: Schema.FiniteFromString,
      })
    );
    let form: AnyFormApi | undefined;
    const submit = vi.fn();
    const FormWithTransformation = () => {
      const appForm = useAppForm({
        defaultValues: { id: "42" },
        onSubmit: async ({ value }) => {
          const decoded = await validator["~standard"].validate(value);
          if ("value" in decoded) {
            submit(decoded.value.id);
          }
        },
        validators: { onSubmit: validator },
      });
      form = appForm;
      return <Form form={appForm} />;
    };

    renderToStaticMarkup(<FormWithTransformation />);
    await form?.handleSubmit();

    expect(submit).toHaveBeenCalledWith(42);
  });

  it("restores defaults and blocks duplicate submissions while pending", async () => {
    let form: AnyFormApi | undefined;
    let resolveMutation: (() => void) | undefined;
    const mutation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveMutation = resolve;
        })
    );
    const { root } = await renderTestForm(
      <TestForm
        onForm={(value) => (form = value)}
        onSubmit={() => mutation()}
      />
    );

    form?.setFieldValue("name", "draft");
    const submission = form?.handleSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(form?.state.isSubmitting).toBe(true);

    void form?.handleSubmit();
    expect(mutation).toHaveBeenCalledOnce();

    resolveMutation?.();
    await submission;
    expect(form?.state.isSubmitting).toBe(false);

    form?.reset();
    expect(form?.state.values).toEqual({ name: "Ala" });
    root.unmount();
  });
});
