# Firecrawl Request Ledger Policy

The squad-builder Firecrawl request ledger exists for monthly budget enforcement and safe operational review.

## Stored fields

Ledger rows should contain only safe operational metadata:

- month (`yearMonth`);
- Margonem profile id;
- request status (`reserved`, `succeeded`, or `failed`);
- credits used;
- timestamp fields;
- safe error tag.

Do not store raw pasted profile URLs, raw Firecrawl HTML, arbitrary user search text, or other private payloads in the ledger.

## Budget enforcement

Monthly budget enforcement reads only rows from the current month. Profile imports and account refetches must reserve budget before calling Firecrawl so exhausted budgets do not spend additional credits.

## Retention and review

Keep successful and failed ledger rows for at least 13 months so year-over-year monthly usage can be reviewed during incidents or capacity planning.

Rows older than 13 months may be archived or deleted after export if long-term audit history is not needed. The ledger is for developers/admins only and must not be exposed to normal users.
