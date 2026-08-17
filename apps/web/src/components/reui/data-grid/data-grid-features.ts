import {
  createExpandedRowModel,
  stockFeatures,
  tableFeatures,
} from "@tanstack/react-table";

/** TanStack Table features required by the shared ReUI data grid. */
export const dataGridFeatures = tableFeatures({
  ...stockFeatures,
  expandedRowModel: createExpandedRowModel(),
});

/** Feature set shared by data-grid columns and table instances. */
export type DataGridFeatures = typeof dataGridFeatures;
