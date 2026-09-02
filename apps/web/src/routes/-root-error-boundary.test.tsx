import { isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { RootErrorBoundary } from "@/routes/__root";

interface ElementProps {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly onClick?: () => void;
  readonly suppressHydrationWarning?: boolean;
}

const asElement = (node: ReactNode): ReactElement<ElementProps> => {
  if (!isValidElement<ElementProps>(node)) {
    throw new Error("Expected a React element");
  }
  return node;
};

const isNodeArray = (
  value: ReactNode | undefined
): value is readonly ReactNode[] => Array.isArray(value);

const getChildren = (element: ReactElement<ElementProps>): ReactNode[] => {
  const { children } = element.props;
  if (!isNodeArray(children)) {
    throw new TypeError("Expected multiple React children");
  }
  return [...children];
};

describe("RootErrorBoundary", () => {
  it("shows the normalized error and invokes reset", () => {
    const reset = vi.fn<() => void>();
    const boundary = asElement(
      RootErrorBoundary({
        error: new Error("Nie udało się załadować danych."),
        reset,
      })
    );

    expect(boundary.props.className).toBeUndefined();
    expect(boundary.props.suppressHydrationWarning).toBe(true);

    const [, bodyNode] = getChildren(boundary);
    const body = asElement(bodyNode);
    const [contentNode] = getChildren(body);
    const content = asElement(contentNode);
    const [, messageNode, retryButtonNode] = getChildren(content);
    const message = asElement(messageNode);
    const retryButton = asElement(retryButtonNode);

    expect(message.props.children).toBe("Nie udało się załadować danych.");
    if (retryButton.props.onClick === undefined) {
      throw new Error("Expected retry button to have an onClick handler");
    }
    retryButton.props.onClick();

    expect(reset).toHaveBeenCalledOnce();
  });
});
