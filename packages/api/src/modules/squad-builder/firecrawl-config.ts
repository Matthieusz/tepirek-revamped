import type { Redacted } from "./prelude";
import { Redacted as redact } from "./prelude";
import { err, ok } from "./result";
import type { Result } from "./result";

/** Number of Firecrawl credits consumed by a scrape. */
export type FirecrawlCreditCount = number & {
  readonly __brand: "FirecrawlCreditCount";
};

/** Runtime config for Firecrawl-backed scraping. */
export interface FirecrawlConfig {
  readonly apiKey: Redacted<string>;
  readonly monthlyRequestBudget: number;
}

/** Expected failure when Firecrawl config is missing or unsafe. */
export interface ParseFirecrawlConfigError {
  readonly _tag: "InvalidFirecrawlConfig";
  readonly message: string;
}

/** Parse a number into a Firecrawl credit count. */
export const parseFirecrawlCreditCount = (
  input: number
): Result<FirecrawlCreditCount, ParseFirecrawlConfigError> => {
  if (!Number.isSafeInteger(input) || input < 0) {
    return err({
      _tag: "InvalidFirecrawlConfig",
      message: "Firecrawl credits used must be a non-negative integer",
    });
  }

  // SAFETY: non-negative integer establishes FirecrawlCreditCount.
  return ok(input as FirecrawlCreditCount);
};

/** Parse Firecrawl config from process-like environment values. */
export const parseFirecrawlConfig = (
  env: Record<string, string | undefined>
): Result<FirecrawlConfig, ParseFirecrawlConfigError> => {
  const apiKey = env.FIRECRAWL_API_KEY;

  if (apiKey === undefined || apiKey.trim().length === 0) {
    return err({
      _tag: "InvalidFirecrawlConfig",
      message: "FIRECRAWL_API_KEY is required",
    });
  }

  const budgetText = env.FIRECRAWL_MONTHLY_REQUEST_BUDGET ?? "900";
  const monthlyRequestBudget = Number(budgetText);

  if (
    !Number.isSafeInteger(monthlyRequestBudget) ||
    monthlyRequestBudget < 1 ||
    monthlyRequestBudget > 1000
  ) {
    return err({
      _tag: "InvalidFirecrawlConfig",
      message:
        "FIRECRAWL_MONTHLY_REQUEST_BUDGET must be an integer from 1 to 1000",
    });
  }

  return ok({ apiKey: redact(apiKey), monthlyRequestBudget });
};
