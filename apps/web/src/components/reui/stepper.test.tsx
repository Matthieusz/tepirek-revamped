import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Stepper, StepperIndicator, StepperItem } from "./stepper";

describe("StepperIndicator", () => {
  it("prefers the loading indicator over the current step state", () => {
    const markup = renderToStaticMarkup(
      <Stepper
        value={1}
        indicators={{ active: "Active icon", loading: "Loading icon" }}
      >
        <StepperItem step={1} loading>
          <StepperIndicator>Fallback icon</StepperIndicator>
        </StepperItem>
      </Stepper>
    );

    expect(markup).toContain("Loading icon");
    expect(markup).not.toContain("Active icon");
    expect(markup).not.toContain("Fallback icon");
  });

  it("uses the state indicator when no loading indicator is provided", () => {
    const markup = renderToStaticMarkup(
      <Stepper value={1} indicators={{ active: "Active icon" }}>
        <StepperItem step={1} loading>
          <StepperIndicator>Fallback icon</StepperIndicator>
        </StepperItem>
      </Stepper>
    );

    expect(markup).toContain("Active icon");
    expect(markup).not.toContain("Fallback icon");
  });

  it("chooses completed and inactive indicators for non-current steps", () => {
    const markup = renderToStaticMarkup(
      <Stepper
        value={2}
        indicators={{ completed: "Completed icon", inactive: "Inactive icon" }}
      >
        <StepperItem step={1}>
          <StepperIndicator>Fallback icon</StepperIndicator>
        </StepperItem>
        <StepperItem step={3}>
          <StepperIndicator>Fallback icon</StepperIndicator>
        </StepperItem>
      </Stepper>
    );

    expect(markup).toContain("Completed icon");
    expect(markup).toContain("Inactive icon");
    expect(markup).not.toContain("Fallback icon");
  });

  it("retains the children fallback for missing or falsy indicators", () => {
    const markup = renderToStaticMarkup(
      <Stepper value={1} indicators={{ active: 0 }}>
        <StepperItem step={1}>
          <StepperIndicator>Fallback icon</StepperIndicator>
        </StepperItem>
        <StepperItem step={2}>
          <StepperIndicator>Inactive fallback</StepperIndicator>
        </StepperItem>
      </Stepper>
    );

    expect(markup).toContain("Fallback icon");
    expect(markup).toContain("Inactive fallback");
  });
});
