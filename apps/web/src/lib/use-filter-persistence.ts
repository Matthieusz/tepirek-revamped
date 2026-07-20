import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useEffect, useState } from "react";

type PersistenceSchema = Schema.Codec<object, unknown, never, never>;

const makeJsonCodec = <S extends PersistenceSchema>(schema: S) =>
  Schema.fromJsonString(Schema.toCodecJson(schema));

/**
 * Decode a persisted value through its schema, preserving defaults for fields
 * omitted by older persisted versions and for invalid storage contents.
 */
export const decodePersistedValue = <S extends PersistenceSchema>(
  schema: S,
  defaults: S["Type"],
  stored: string | null
): S["Type"] => {
  if (stored === null) {
    return defaults;
  }

  try {
    const decoded = Schema.decodeUnknownSync(makeJsonCodec(schema))(stored);
    return { ...defaults, ...decoded };
  } catch {
    return defaults;
  }
};

/** Encode a typed persisted value with the schema's JSON codec. */
export const encodePersistedValue = <S extends PersistenceSchema>(
  schema: S,
  value: S["Type"]
): string => Schema.encodeSync(makeJsonCodec(schema))(value);

/** Merge a partial filter update, preserving current state when it is invalid. */
export const applyFilterUpdates = <S extends PersistenceSchema>(
  schema: S,
  current: S["Type"],
  updates: object
): S["Type"] =>
  Schema.decodeUnknownOption(schema)({ ...current, ...updates }).pipe(
    Option.getOrElse(() => current)
  );

/**
 * Persist filter state in localStorage, restoring on initial load to avoid flash.
 * Syncs to localStorage whenever filters change.
 *
 * @param {string} key - Unique localStorage key (e.g., "ranking-filters")
 * @param schema - Effect Schema for the complete persisted filter value
 * @param defaults - Default filter values when nothing is stored
 */
export const useFilterPersistence = <S extends PersistenceSchema>(
  key: string,
  schema: S,
  defaults: S["Type"]
): [S["Type"], (updates: Partial<S["Type"]>) => void] => {
  const [filters, setFilters] = useState<S["Type"]>(defaults);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      setFilters(
        decodePersistedValue(schema, defaults, window.localStorage.getItem(key))
      );
    } catch {
      // Ignore unavailable localStorage in a browser context where storage
      // access is denied; the in-memory default remains usable.
    }
    setIsHydrated(true);
  }, [defaults, key, schema]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(key, encodePersistedValue(schema, filters));
    } catch {
      // Ignore unavailable localStorage and impossible schema encoding
      // failures; the in-memory filter state remains usable.
    }
  }, [filters, isHydrated, key, schema]);

  const updateFilters = (updates: Partial<S["Type"]>) => {
    setFilters((prev) => applyFilterUpdates(schema, prev, updates));
  };

  return [filters, updateFilters];
};
