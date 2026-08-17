import {
  columnVisibilityFeature,
  rowSelectionFeature,
  tableFeatures,
} from "@tanstack/react-table";

/** Feature set used by the read-only players table. */
export const playerTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowSelectionFeature,
});

/** Feature set shared by player-table columns and the table instance. */
export type PlayerTableFeatures = typeof playerTableFeatures;
