"use client";

/* V6 headless table on @tanstack/react-table v8: sticky header, 1px
   separators, right-aligned mono numbers, status chips, sortable columns,
   row hover, empty + loading states. On mobile each row becomes a card. */

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type HeaderGroup,
  type Row,
  type Cell,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui";

export type TableRow = Record<string, string | number | undefined>;

export function DataTable({ columns, data, empty, loading }: {
  columns: { key: string; header: string; numeric?: boolean; chip?: boolean; render?: (row: TableRow) => React.ReactNode }[];
  data: TableRow[];
  empty: string;
  loading?: boolean;
}) {
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const cols = useMemo<ColumnDef<TableRow, unknown>[]>(
    () =>
      columns.map((c): ColumnDef<TableRow, unknown> => ({
        id: c.key,
        header: c.header,
        accessorFn: (row) => row[c.key],
        cell: (ctx) => {
          const row = ctx.row.original;
          if (c.render) return c.render(row);
          const v = row[c.key];
          if (c.chip) return <Badge status={String(v ?? "")} />;
          if (c.numeric) return <span className="font-mono tabular-nums">{String(v ?? "")}</span>;
          return <span>{String(v ?? "")}</span>;
        },
      })),
    [columns],
  );
  const table = useReactTable({ columns: cols, data, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });

  if (loading) return <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skel h-12 rounded-card" />)}</div>;
  if (data.length === 0) return <p className="rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">{empty}</p>;

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead className="sticky top-0 bg-surface">
          {table.getHeaderGroups().map((hg: HeaderGroup<TableRow>) => (
            <tr key={hg.id}>
              {hg.headers.map((h, i) => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className={`border-b border-line px-3 py-2.5 font-semibold text-muted ${columns[i]?.numeric ? "text-right" : "text-left"} ${h.column.getCanSort() ? "cursor-pointer select-none hover:text-ink" : ""}`}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getIsSorted() === "asc" ? " ↑" : h.column.getIsSorted() === "desc" ? " ↓" : ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r: Row<TableRow>) => (
            <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-bg">
              {r.getVisibleCells().map((cell: Cell<TableRow, unknown>, i: number) => (
                <td key={cell.id} className={`px-3 py-2.5 ${columns[i]?.numeric ? "text-right" : ""}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
