import * as Effect from "effect/Effect";

import type { AccountImportStoreService } from "../../services/squad-builder/account-import/account-import-store.ts";
import type { AccountRefetchStoreService } from "../../services/squad-builder/account-refetch/account-refetch-store.ts";
import type { AccountSharingStoreService } from "../../services/squad-builder/account-sharing/account-sharing-store.ts";
import type { FirecrawlRequestAccountingStoreService } from "../../services/squad-builder/firecrawl-request-accounting-store.ts";
import type { SquadGroupStoreService } from "../../services/squad-builder/squad-groups/squad-group-store.ts";

const makeStoreTestService = <Service extends object>(
  serviceName: string,
  overrides: Partial<Service>
): Service => {
  const service = new Proxy(overrides, {
    get: (target, operation: string | symbol, receiver) => {
      if (Reflect.has(target, operation)) {
        return Reflect.get(target, operation, receiver);
      }

      return () =>
        Effect.die(
          new Error(`Unexpected ${serviceName}.${String(operation)} call`)
        );
    },
  });

  // SAFETY: The proxy supplies every omitted service operation with a defecting implementation.
  return service as Service;
};

/** Build a squad-group store test service with explicit operation overrides. */
export const makeSquadGroupStoreServiceTestService = (
  overrides: Partial<typeof SquadGroupStoreService.Service>
): typeof SquadGroupStoreService.Service =>
  makeStoreTestService("SquadGroupStoreService", overrides);

/** Build an account-import store test service with explicit operation overrides. */
export const makeAccountImportStoreServiceTestService = (
  overrides: Partial<typeof AccountImportStoreService.Service>
): typeof AccountImportStoreService.Service =>
  makeStoreTestService("AccountImportStoreService", overrides);

/** Build an account-refetch store test service with explicit operation overrides. */
export const makeAccountRefetchStoreServiceTestService = (
  overrides: Partial<typeof AccountRefetchStoreService.Service>
): typeof AccountRefetchStoreService.Service =>
  makeStoreTestService("AccountRefetchStoreService", overrides);

/** Build a Firecrawl request-accounting test service with explicit operation overrides. */
export const makeFirecrawlRequestAccountingStoreServiceTestService = (
  overrides: Partial<typeof FirecrawlRequestAccountingStoreService.Service>
): typeof FirecrawlRequestAccountingStoreService.Service =>
  makeStoreTestService("FirecrawlRequestAccountingStoreService", overrides);

/** Build an account-sharing store test service with explicit operation overrides. */
export const makeAccountSharingStoreServiceTestService = (
  overrides: Partial<typeof AccountSharingStoreService.Service>
): typeof AccountSharingStoreService.Service =>
  makeStoreTestService("AccountSharingStoreService", overrides);
