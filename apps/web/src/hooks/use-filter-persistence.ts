import { useEffect, useRef, useState } from "react";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Persist filter state in localStorage, restoring on initial load to avoid flash.
 * Syncs to localStorage whenever filters change.
 *
 * @param {string} key - Unique localStorage key (e.g., "ranking-filters")
 * @param {T} defaults - Default filter values when nothing is stored
 */
export const useFilterPersistence = <T extends Record<string, unknown>>(
  key: string,
  defaults: T
): [T, (updates: Partial<T>) => void] => {
  const isInitialized = useRef(false);

  const [filters, setFilters] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isRecord(parsed)) {
          return { ...defaults, ...parsed } as T;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return defaults;
  });

  useEffect(() => {
    if (isInitialized.current) {
      localStorage.setItem(key, JSON.stringify(filters));
    } else {
      isInitialized.current = true;
    }
  }, [filters, key]);

  const updateFilters = (updates: Partial<T>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  return [filters, updateFilters];
};
