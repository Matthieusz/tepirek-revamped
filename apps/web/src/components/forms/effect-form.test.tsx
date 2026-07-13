import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EffectForm, EffectFormFeedback } from "@/components/forms/effect-form";

describe("EffectForm", () => {
  it("disables native validation on managed forms", () => {
    const markup = renderToStaticMarkup(
      <EffectForm action={() => undefined}>
        <input aria-label="Nazwa" required />
      </EffectForm>
    );

    expect(markup).toContain("noValidate");
    expect(markup).toContain('required=""');
  });

  it("renders one persistent failure message without changing field errors", () => {
    const markup = renderToStaticMarkup(
      <EffectFormFeedback
        result={AsyncResult.fail(new Error("Nie udało się zapisać"))}
      />
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-live="assertive"');
    expect(markup).toContain("Nie udało się zapisać");
  });
});
