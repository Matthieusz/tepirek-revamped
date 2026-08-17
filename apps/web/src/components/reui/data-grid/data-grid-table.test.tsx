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
    meta: {
      skeleton: "Skeleton",
    },
  },
];

type DataGridHarnessProps = {
  data?: TestRow[];
  isLoading?: boolean;
  loadingMode?: "skeleton" | "spinner";
  recordCount?: number;
};

const DataGridHarness = ({
  data = [{ id: "1", name: "Ada" }],
  isLoading = false,
  loadingMode = "skeleton",
  recordCount = data.length,
}: DataGridHarnessProps) => {
  const table = useTable({
    columns,
    data,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  });

  return (
    <DataGrid
      isLoading={isLoading}
      loadingMode={loadingMode}
      recordCount={recordCount}
      table={table}
    >
      <DataGridTable />
    </DataGrid>
  );
};

describe("DataGridTable", () => {
  it("renders rows through the TanStack Table v9 feature set", () => {
    const markup = renderToStaticMarkup(<DataGridHarness />);

    expect(markup).toContain("Ada");
  });

  it("announces spinner loading while retaining the visible status", () => {
    const markup = renderToStaticMarkup(
      <DataGridHarness isLoading loadingMode="spinner" />
    );

    expect(markup).toContain('data-slot="data-grid-status"');
    expect(markup).toContain("Loading...");
    expect(markup).toContain("animate-spin");
    expect(markup.match(/role=\"status\"/g)).toHaveLength(2);
  });

  it("announces skeleton loading through the mounted status region", () => {
    const markup = renderToStaticMarkup(
      <DataGridHarness isLoading loadingMode="skeleton" />
    );

    expect(markup).toContain('data-slot="data-grid-status"');
    expect(markup).toContain("Loading...");
    expect(markup).toContain('data-slot="data-grid-table-body"');
    expect(markup).toContain("Skeleton");
    expect(markup.match(/role=\"status\"/g)).toHaveLength(1);
  });

  it("announces completion and empty states", () => {
    const loadedMarkup = renderToStaticMarkup(<DataGridHarness />);
    const emptyMarkup = renderToStaticMarkup(<DataGridHarness data={[]} />);

    expect(loadedMarkup).toContain("Data loaded");
    expect(emptyMarkup).toContain("No data available");
  });
});
