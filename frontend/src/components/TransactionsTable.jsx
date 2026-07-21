import {
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  MoreVertical,
  Edit3,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "../lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/DropdownMenu";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/Tooltip";

export function TransactionsTable({
  transactions,
  categories = [],
  colors = {},
  selectable = false,
  selected = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onEdit,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
}) {
  const categoryName = (id) => categories.find((c) => c.id === id)?.name ?? id;

  if (!transactions.length) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-line)] py-14 text-center">
        <p className="text-sm text-[var(--color-ink-soft)]">No transactions yet.</p>
      </div>
    );
  }

  const allSelected = transactions.length > 0 && transactions.every((t) => selected.has(t.id));

  const renderSortButton = (column) => {
    if (!onSort) return column.label;
    const isActive = sortBy === column.key;
    const direction = isActive && sortOrder === "asc" ? "↑" : "↓";
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-left font-medium"
        onClick={() => {
          const nextOrder = isActive ? (sortOrder === "asc" ? "desc" : "asc") : "asc";
          onSort(column.key, nextOrder);
        }}
      >
        {column.label}
        {isActive && <span className="text-[var(--color-ink-soft)]">{direction}</span>}
      </button>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-line)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleSelectAll?.(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-line)] accent-[var(--color-ledger)]"
                />
              </th>
            )}
            <th className="px-4 py-3">{renderSortButton({ key: "date", label: "Date" })}</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">{renderSortButton({ key: "category", label: "Category" })}</th>
            <th className="px-4 py-3 text-right">{renderSortButton({ key: "amount", label: "Amount" })}</th>
            {(onEdit || onDelete) && <th className="w-20 px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr
              key={t.id}
              onClick={() => onRowClick?.(t)}
              className={cn(
                "border-b border-[var(--color-line)] last:border-b-0 hover:bg-black/[0.02]",
                onRowClick && "cursor-pointer"
              )}
            >
              {selectable && (
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => onToggleSelect?.(t.id)}
                    className="h-4 w-4 rounded border-[var(--color-line)] accent-[var(--color-ledger)]"
                  />
                </td>
              )}
              <td className="px-4 py-3 whitespace-nowrap text-[var(--color-ink-soft)]">
                {formatDate(t.date)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {t.type === "INCOME" ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-[var(--color-ledger)] shrink-0" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-rust)] shrink-0" />
                  )}
                  <span>{t.description || categoryName(t.category)}</span>
                  {t.isRecurring && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center rounded-full bg-[var(--color-line)] px-2 py-0.5 text-xs text-[var(--color-ink-soft)]">
                          <Repeat className="mr-1 h-3 w-3" /> Recurring
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t.nextRecurringDate
                          ? `Next due ${formatDate(t.nextRecurringDate, { month: "short", day: "numeric", year: "numeric" })}`
                          : "Recurring transaction"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${colors[t.category] ?? "#94a3b8"}1a`,
                    color: colors[t.category] ?? "#64748b",
                  }}
                >
                  {categoryName(t.category)}
                </span>
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-right font-mono font-medium whitespace-nowrap",
                  t.type === "INCOME" ? "text-[var(--color-ledger)]" : "text-[var(--color-rust)]"
                )}
              >
                {t.type === "INCOME" ? "+" : "−"}
                {formatCurrency(t.amount)}
              </td>
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-ink-soft)] hover:bg-black/[0.03]"
                        aria-label="Open transaction menu"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(t)}>
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem destructive onClick={() => onDelete(t)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
