import * as Option from "effect/Option";
import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  EffectCheckboxField,
  EffectFieldFrame,
  EffectNumberField,
  EffectStringSelectField,
  EffectTextField,
  EffectTextareaField,
} from "@/components/forms/effect-form-fields";

const makeStringField = (error: Option.Option<string>) => ({
  error,
  isDirty: false,
  isTouched: Option.isSome(error),
  isValidating: false,
  onBlur: () => undefined,
  onChange: () => undefined,
  path: "profile.name",
  value: "Ala",
});

describe("Effect Form fields", () => {
  it("forwards controlled text updates and blur events", () => {
    const onBlur = vi.fn();
    const onChange = vi.fn();
    const renderedField = EffectTextField({
      field: {
        ...makeStringField(Option.none()),
        onBlur,
        onChange,
      },
      props: { label: "Nazwa" },
    });

    expect(
      isValidElement<{ children?: ReactNode }>(renderedField)
    ).toBeTruthy();
    if (!isValidElement<{ children?: ReactNode }>(renderedField)) {
      return;
    }

    const input = Children.toArray(renderedField.props.children).find(
      (child) =>
        isValidElement<{
          onBlur?: () => void;
          onChange?: (event: { target: { value: string } }) => void;
        }>(child) && typeof child.props.onChange === "function"
    );
    expect(isValidElement(input)).toBeTruthy();
    if (
      !isValidElement<{
        onBlur?: () => void;
        onChange?: (event: { target: { value: string } }) => void;
      }>(input)
    ) {
      return;
    }

    input.props.onChange?.({ target: { value: "Ola" } });
    input.props.onBlur?.();

    expect(onChange).toHaveBeenCalledWith("Ola");
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it("renders controlled values and accessible error relationships", () => {
    const markup = renderToStaticMarkup(
      <EffectTextField
        field={makeStringField(Option.some("Nazwa jest wymagana"))}
        props={{ label: "Nazwa", required: true }}
      />
    );

    expect(markup).toContain('name="profile.name"');
    expect(markup).toContain('value="Ala"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('id="field-profile-name"');
    expect(markup).toContain('aria-describedby="field-profile-name-error"');
    expect(markup).toContain('aria-required="true"');
    expect(markup).not.toContain(' required=""');
    expect(markup).toContain('id="field-profile-name-error"');
    expect(markup).toContain("Nazwa jest wymagana");
  });

  it("omits error ARIA attributes when a textarea is valid", () => {
    const markup = renderToStaticMarkup(
      <EffectTextareaField
        field={makeStringField(Option.none())}
        props={{ label: "Opis" }}
      />
    );

    expect(markup).toContain("<textarea");
    expect(markup).toContain("Ala</textarea>");
    expect(markup).not.toContain("aria-describedby");
    expect(markup).not.toContain('role="alert"');
  });

  it("forwards decimal number input without truncating it", () => {
    const onChange = vi.fn();
    const renderedField = EffectNumberField({
      field: {
        ...makeStringField(Option.none()),
        onChange,
        value: 1,
      },
      props: { label: "Poziom" },
    });

    expect(
      isValidElement<{ children?: ReactNode }>(renderedField)
    ).toBeTruthy();
    if (!isValidElement<{ children?: ReactNode }>(renderedField)) {
      return;
    }

    const input = Children.toArray(renderedField.props.children).find(
      (child) =>
        isValidElement<{
          onChange?: (event: { target: { value: string } }) => void;
        }>(child) && typeof child.props.onChange === "function"
    );
    expect(isValidElement(input)).toBeTruthy();
    if (
      !isValidElement<{
        onChange?: (event: { target: { value: string } }) => void;
      }>(input)
    ) {
      return;
    }

    input.props.onChange?.({ target: { value: "1.5" } });

    expect(onChange).toHaveBeenCalledWith(1.5);
  });

  it("renders controlled number values and accessible errors", () => {
    const markup = renderToStaticMarkup(
      <EffectNumberField
        field={{
          ...makeStringField(Option.some("Podaj poprawny poziom")),
          value: 42,
        }}
        props={{ label: "Poziom" }}
      />
    );

    expect(markup).toContain('type="number"');
    expect(markup).toContain('value="42"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="field-profile-name-error"');
    expect(markup).toContain("Podaj poprawny poziom");
  });

  it("renders a controlled checkbox with accessible error relationships", () => {
    const markup = renderToStaticMarkup(
      <EffectCheckboxField
        field={{
          ...makeStringField(Option.some("Potwierdź wybór")),
          value: true,
        }}
        props={{ label: "Mistrzostwo?" }}
      />
    );

    expect(markup).toContain('name="profile.name"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="field-profile-name-error"');
    expect(markup).toContain("Potwierdź wybór");
  });

  it("renders helper text and an associated error in the shared frame", () => {
    const markup = renderToStaticMarkup(
      <EffectFieldFrame
        error={Option.some("Wartość jest wymagana")}
        fieldId="field-name"
        helperText={<p id="field-name-helper">Pomocnicza podpowiedź</p>}
        label="Nazwa"
      >
        <input
          aria-describedby="field-name-helper field-name-error"
          id="field-name"
          name="name"
        />
      </EffectFieldFrame>
    );

    expect(markup).toContain('for="field-name"');
    expect(markup).toContain('id="field-name-helper"');
    expect(markup).not.toContain('role="alert"');
    expect(markup).toContain("Wartość jest wymagana");
  });

  it("renders a controlled select with accessible error relationships", () => {
    const markup = renderToStaticMarkup(
      <EffectStringSelectField
        field={makeStringField(Option.some("Wybierz profesję"))}
        props={{
          label: "Profesja",
          options: [{ label: "Mag", value: "mage" }],
          placeholder: "Wybierz profesję",
        }}
      />
    );

    expect(markup).toContain('name="profile.name"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="field-profile-name-error"');
    expect(markup).toContain('id="field-profile-name-error"');
    expect(markup).toContain("Wybierz profesję");
  });
});
