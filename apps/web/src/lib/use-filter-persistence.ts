import * as Schema from "effect/Schema";
import { useEffect, useRef, useState } from "react";

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
  const isInitialized = useRef(false);

  const [filters, setFilters] = useState<S["Type"]>(() => {
    try {
      return decodePersistedValue(schema, defaults, localStorage.getItem(key));
    } catch {
      // Ignore unavailable localStorage during server rendering or in a
      // browser context where storage access is denied.
      return defaults;
    }
  });

  useEffect(() => {
    if (isInitialized.current) {
      try {
        localStorage.setItem(key, encodePersistedValue(schema, filters));
      } catch {
        // Ignore unavailable localStorage and impossible schema encoding
        // failures; the in-memory filter state remains usable.
      }
    } else {
      isInitialized.current = true;
    }
  }, [filters, key, schema]);

  const updateFilters = (updates: Partial<S["Type"]>) => {
    setFilters((prev) =>
      Schema.decodeUnknownSync(schema)({ ...prev, ...updates })
    );
  };

  return [filters, updateFilters];
};
