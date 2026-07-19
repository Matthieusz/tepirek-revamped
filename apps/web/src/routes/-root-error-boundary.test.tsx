import { describe, expect, it, vi } from "vitest";

import { RootErrorBoundary } from "@/routes/__root";

describe("RootErrorBoundary", () => {
  it("shows the normalized error and invokes reset", () => {
    const reset = vi.fn();
    const boundary = RootErrorBoundary({
      error: new Error("Nie udało się załadować danych."),
      reset,
    });

    const [, body] = boundary.props.children;
    const [content] = body.props.children;
    const [, message, retryButton] = content.props.children;

    expect(message.props.children).toBe("Nie udało się załadować danych.");
    retryButton.props.onClick();

    expect(reset).toHaveBeenCalledOnce();
  });
});
