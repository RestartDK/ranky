"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  LinkedinLogo,
  MagnifyingGlass,
} from "@phosphor-icons/react";

interface LeadResult {
  id: string;
  qualified: boolean;
  score: number | null;
  personaRole: string | null;
  companyRank: number | null;
  rejectionReason: string | null;
  lead: {
    normalisedName: string | null;
    normalisedTitle: string | null;
    normalisedCompany: string | null;
    normalisedFunction: string | null;
    normalisedSeniority: string | null;
    linkedinUrl: string | null;
  } | null;
}

interface Run {
  id: string;
  method: string;
  createdAt: string;
  results: LeadResult[];
}

function exportToCsv(results: LeadResult[], method: string) {
  const headers = [
    "Company Rank",
    "Qualified",
    "Score",
    "Persona Role",
    "Name",
    "Title",
    "Company",
    "Function",
    "Seniority",
    "LinkedIn",
    "Rejection Reason",
  ];

  const rows = results.map((r) => [
    r.companyRank ?? "",
    r.qualified ? "Yes" : "No",
    r.score ?? "",
    r.personaRole ?? "",
    r.lead?.normalisedName ?? "",
    r.lead?.normalisedTitle ?? "",
    r.lead?.normalisedCompany ?? "",
    r.lead?.normalisedFunction ?? "",
    r.lead?.normalisedSeniority ?? "",
    r.lead?.linkedinUrl ?? "",
    r.rejectionReason ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ranking-${method}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (isSorted === "asc") return <ArrowUp className="size-3" />;
  if (isSorted === "desc") return <ArrowDown className="size-3" />;
  return <ArrowsDownUp className="size-3 opacity-40" />;
}

function buildColumns(showPersonaRole: boolean): ColumnDef<LeadResult>[] {
  const cols: ColumnDef<LeadResult>[] = [
    {
      accessorKey: "companyRank",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Rank
          <SortIcon isSorted={column.getIsSorted()} />
        </button>
      ),
      size: 60,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue<number | null>(columnId);
        const b = rowB.getValue<number | null>(columnId);
        if (a == null && b == null) return 0;
        if (a == null) return 1;
        if (b == null) return -1;
        return a - b;
      },
      cell: ({ row }) => {
        const rank = row.original.companyRank;
        return rank ? `#${rank}` : "—";
      },
    },
    {
      accessorKey: "qualified",
      header: "Status",
      size: 90,
      enableSorting: false,
      cell: ({ row }) => (
        <Badge
          variant={row.original.qualified ? "default" : "destructive"}
          className="text-[10px]"
        >
          {row.original.qualified ? "Qualified" : "Rejected"}
        </Badge>
      ),
    },
    {
      accessorKey: "score",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Score
          <SortIcon isSorted={column.getIsSorted()} />
        </button>
      ),
      size: 70,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue<number | null>(columnId);
        const b = rowB.getValue<number | null>(columnId);
        if (a == null && b == null) return 0;
        if (a == null) return 1;
        if (b == null) return -1;
        return a - b;
      },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {row.original.score ?? "—"}
        </span>
      ),
    },
  ];

  if (showPersonaRole) {
    cols.push({
      accessorKey: "personaRole",
      header: "Role",
      size: 100,
      enableSorting: false,
      cell: ({ row }) => {
        const role = row.original.personaRole;
        if (!role) return "—";
        const variant =
          role === "Buyer"
            ? "default"
            : role === "Not Relevant"
              ? "destructive"
              : "secondary";
        return (
          <Badge variant={variant} className="text-[10px]">
            {role}
          </Badge>
        );
      },
    });
  }

  cols.push(
    {
      id: "name",
      accessorFn: (row) => row.lead?.normalisedName ?? "",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <SortIcon isSorted={column.getIsSorted()} />
        </button>
      ),
      size: 160,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.lead?.normalisedName ?? "—"}
        </span>
      ),
    },
    {
      id: "title",
      accessorFn: (row) => row.lead?.normalisedTitle ?? "",
      header: "Title",
      size: 200,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block">
          {row.original.lead?.normalisedTitle ?? "—"}
        </span>
      ),
    },
    {
      id: "company",
      accessorFn: (row) => row.lead?.normalisedCompany ?? "",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company
          <SortIcon isSorted={column.getIsSorted()} />
        </button>
      ),
      size: 140,
    },
    {
      id: "function",
      accessorFn: (row) => row.lead?.normalisedFunction ?? "",
      header: "Function",
      size: 120,
      enableSorting: false,
    },
    {
      id: "seniority",
      accessorFn: (row) => row.lead?.normalisedSeniority ?? "",
      header: "Seniority",
      size: 100,
      enableSorting: false,
    },
    {
      id: "linkedin",
      header: "LI",
      size: 40,
      enableSorting: false,
      cell: ({ row }) => {
        const url = row.original.lead?.linkedinUrl;
        if (!url) return null;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <LinkedinLogo className="size-4" weight="fill" />
          </a>
        );
      },
    },
    {
      accessorKey: "rejectionReason",
      header: "Reason",
      size: 200,
      enableSorting: false,
      cell: ({ row }) => {
        const reason = row.original.rejectionReason;
        if (!reason) return null;
        return (
          <span className="max-w-[200px] truncate block text-muted-foreground">
            {reason}
          </span>
        );
      },
    },
  );

  return cols;
}

function DataTablePagination<TData>({
  table,
}: {
  table: ReturnType<typeof useReactTable<TData>>;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex-1 text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length} total row(s)
      </div>
      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-xs font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <CaretDoubleLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <CaretLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <CaretRight className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <CaretDoubleRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RunTable({
  run,
  showPersonaRole,
}: {
  run: Run;
  showPersonaRole: boolean;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "companyRank", desc: false },
  ]);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const columns = React.useMemo(
    () => buildColumns(showPersonaRole),
    [showPersonaRole],
  );

  const table = useReactTable({
    data: run.results,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const lead = row.original.lead;
      return (
        (lead?.normalisedName?.toLowerCase().includes(search) ?? false) ||
        (lead?.normalisedTitle?.toLowerCase().includes(search) ?? false) ||
        (lead?.normalisedCompany?.toLowerCase().includes(search) ?? false) ||
        (lead?.normalisedFunction?.toLowerCase().includes(search) ?? false)
      );
    },
  });

  const qualifiedCount = run.results.filter((r) => r.qualified).length;
  const rejectedCount = run.results.length - qualifiedCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-8 w-[200px] pl-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {qualifiedCount} qualified
            </Badge>
            <Badge variant="destructive" className="text-[10px]">
              {rejectedCount} rejected
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCsv(run.results, run.method)}
        >
          <DownloadSimple className="size-3.5" data-icon="inline-start" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-hidden border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}

export function ResultsView({ runs }: { runs: Run[] }) {
  const hardRulesRun = runs.find((r) => r.method === "hard_rules");
  const llmRun = runs.find((r) => r.method === "hard_rules_llm");

  if (!hardRulesRun && !llmRun) {
    return <p className="text-sm text-muted-foreground">No results found.</p>;
  }

  const defaultTab = llmRun ? "llm" : "hard_rules";

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        {hardRulesRun && (
          <TabsTrigger value="hard_rules">Hard Rules Only</TabsTrigger>
        )}
        {llmRun && (
          <TabsTrigger value="llm">Hard Rules + LLM</TabsTrigger>
        )}
      </TabsList>

      {hardRulesRun && (
        <TabsContent value="hard_rules">
          <RunTable run={hardRulesRun} showPersonaRole={false} />
        </TabsContent>
      )}

      {llmRun && (
        <TabsContent value="llm">
          <RunTable run={llmRun} showPersonaRole={true} />
        </TabsContent>
      )}
    </Tabs>
  );
}
