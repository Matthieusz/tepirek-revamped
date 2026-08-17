import { useTable } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataGrid } from "@/components/reui/data-grid/data-grid";
import { dataGridFeatures } from "@/components/reui/data-grid/data-grid-features";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid-features";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";

type TestRow = {
  readonly id: string;
  readonly name: string;
};

const columns: ColumnDef<DataGridFeatures, TestRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
];

const DataGridHarness = () => {
  const table = useTable({
    columns,
    data: [{ id: "1", name: "Ada" }],
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  });

  return (
    <DataGrid recordCount={1} table={table}>
      <DataGridTable />
    </DataGrid>
  );
};

describe("DataGridTable", () => {
  it("renders rows through the TanStack Table v9 feature set", () => {
    const markup = renderToStaticMarkup(<DataGridHarness />);

    expect(markup).toContain("Ada");
  });
});
