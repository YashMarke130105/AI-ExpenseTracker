import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Star } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { TransactionsTable } from "../components/TransactionsTable";
import { api } from "../lib/api";
import { useCategories } from "../lib/useCategories";
import { formatCurrency, cn } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";

const RANGE_OPTIONS = [
  { value: "7D", label: "7D" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "ALL", label: "All time" },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - i);

export default function AccountPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { categories, colors } = useCategories();
  const [account, setAccount] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [tableTransactions, setTableTransactions] = useState([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [recurringFilter, setRecurringFilter] = useState("ALL");
  const [dateFilterDay, setDateFilterDay] = useState("ALL");
  const [dateFilterMonth, setDateFilterMonth] = useState("ALL");
  const [dateFilterYear, setDateFilterYear] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selected, setSelected] = useState(new Set());
  const [range, setRange] = useState("1M");
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, accts] = await Promise.all([
        api.get(`/accounts/${id}`),
        api.get("/dashboard/accounts"),
      ]);
      setAccount(acc);
      setAllAccounts(accts);
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const fetchTransactions = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("accountId", id);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (recurringFilter === "RECURRING") params.set("isRecurring", "true");
      if (recurringFilter === "ONEOFF") params.set("isRecurring", "false");
      if (search.trim()) params.set("search", search.trim());
      if (dateFilterDay !== "ALL") params.set("dateDay", dateFilterDay);
      if (dateFilterMonth !== "ALL") params.set("dateMonth", dateFilterMonth);
      if (dateFilterYear !== "ALL") params.set("dateYear", dateFilterYear);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", "10");
      params.set("page", String(page));
      const result = await api.get(`/transactions?${params.toString()}`);
      setTableTransactions(result.transactions);
      setTableTotal(result.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setTableLoading(false);
    }
  }, [id, page, search, typeFilter, recurringFilter, dateFilterDay, dateFilterMonth, dateFilterYear, sortBy, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const transactionsForChart = useMemo(() => account?.transactions ?? [], [account]);

  const totals = useMemo(() => {
    const values = { income: 0, expense: 0 };
    for (const txn of transactionsForChart) {
      if (txn.type === "INCOME") values.income += txn.amount;
      else values.expense += txn.amount;
    }
    return { income: values.income, expense: values.expense, net: values.income - values.expense };
  }, [transactionsForChart]);

  const rangeTransactions = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (range === "7D") start.setDate(now.getDate() - 6);
    else if (range === "1M") start.setMonth(now.getMonth() - 1);
    else if (range === "3M") start.setMonth(now.getMonth() - 3);
    else if (range === "6M") start.setMonth(now.getMonth() - 6);
    else start.setFullYear(1970);

    return transactionsForChart.filter((txn) => new Date(txn.date) >= start);
  }, [range, transactionsForChart]);

  const chartData = useMemo(() => {
    const buckets = {};
    for (const txn of rangeTransactions) {
      const date = new Date(txn.date);
      const key = range === "7D"
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { key, income: 0, expense: 0 };
      if (txn.type === "INCOME") buckets[key].income += txn.amount;
      else buckets[key].expense += txn.amount;
    }
    return Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => ({
        ...item,
        label: range === "7D"
          ? new Date(item.key).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : new Date(`${item.key}-01`).toLocaleDateString("en-US", { month: "short" }),
      }));
  }, [range, rangeTransactions]);

  function toggleSelect(txnId) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(txnId) ? next.delete(txnId) : next.add(txnId);
      return next;
    });
  }

  function toggleSelectAll(checked) {
    setSelected(checked ? new Set(tableTransactions.map((t) => t.id)) : new Set());
  }

  async function handleBulkDelete() {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} transaction(s)? This will adjust the account balance.`)) return;
    setDeleting(true);
    try {
      await api.post("/accounts/transactions/bulk-delete", {
        transactionIds: Array.from(selected),
      });
      setSelected(new Set());
      await fetchAccount();
      await fetchTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteRow(transaction) {
    if (!confirm("Delete this transaction? This will adjust the account balance.")) return;
    try {
      await api.delete(`/transactions/${transaction.id}`);
      await fetchAccount();
      await fetchTransactions();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSetDefault() {
    try {
      await api.patch(`/accounts/${id}/default`);
      await fetchAccount();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-sm text-[var(--color-ink-soft)]">Loading account…</p>;

  if (!account) {
    return (
      <div>
        <Link to="/" className="text-sm text-[var(--color-ledger)] hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <p className="text-sm text-[var(--color-rust)]">Account not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <Link to="/" className="text-sm text-[var(--color-ledger)] hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-medium">{account.name}</h1>
              <button
                onClick={() => !account.isDefault && handleSetDefault()}
                title={account.isDefault ? "Default account" : "Set as default"}
                className={cn(account.isDefault ? "text-[var(--color-gold)]" : "text-[var(--color-line)] hover:text-[var(--color-gold)]")}
              >
                <Star className="h-5 w-5" fill={account.isDefault ? "currentColor" : "none"} />
              </button>
            </div>
            <p className="text-[var(--color-ink-soft)] capitalize mt-1">
              {account.type.toLowerCase()} account · {account._count?.transactions ?? 0} transactions
            </p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "font-mono text-3xl font-medium",
                account.balance < 0 ? "text-[var(--color-rust)]" : "text-[var(--color-ink)]"
              )}
            >
              {formatCurrency(account.balance)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-rust)] bg-[var(--color-rust-soft)] rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>Filter and sort your transaction history.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <Input
                  type="search"
                  placeholder="Search description"
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                  className="min-w-[14rem]"
                />
                <Select
                  value={typeFilter}
                  onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }}
                >
                  <option value="ALL">All types</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </Select>
                <Select
                  value={recurringFilter}
                  onChange={(e) => { setPage(1); setRecurringFilter(e.target.value); }}
                >
                  <option value="ALL">All</option>
                  <option value="RECURRING">Recurring</option>
                  <option value="ONEOFF">One-off</option>
                </Select>
                <Select
                  value={dateFilterDay}
                  onChange={(e) => { setPage(1); setDateFilterDay(e.target.value); }}
                >
                  <option value="ALL">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={String(day)}>{day}</option>
                  ))}
                </Select>
                <Select
                  value={dateFilterMonth}
                  onChange={(e) => { setPage(1); setDateFilterMonth(e.target.value); }}
                >
                  <option value="ALL">Month</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {new Date(0, i).toLocaleString("default", { month: "short" })}
                    </option>
                  ))}
                </Select>
                <Select
                  value={dateFilterYear}
                  onChange={(e) => { setPage(1); setDateFilterYear(e.target.value); }}
                >
                  <option value="ALL">Year</option>
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TransactionsTable
              transactions={tableTransactions}
              categories={categories}
              colors={colors}
              selectable
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onEdit={(txn) => navigate(`/transactions/${txn.id}/edit`)}
              onDelete={handleDeleteRow}
              onRowClick={(txn) => navigate(`/transactions/${txn.id}/edit`)}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={(key, order) => { setSortBy(key); setSortOrder(order); }}
            />

            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--color-ink-soft)]">
              <p>
                Showing {tableTransactions.length} of {tableTotal} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <span>Page {page}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => (prev * 10 < tableTotal ? prev + 1 : prev))} disabled={page * 10 >= tableTotal}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account summary</CardTitle>
              <CardDescription>Totals for the selected account across the current data set.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-line)] px-4 py-3">
                  <span className="text-sm text-[var(--color-ink-soft)]">Income</span>
                  <span className="font-mono font-semibold text-[var(--color-ledger)]">{formatCurrency(totals.income)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-line)] px-4 py-3">
                  <span className="text-sm text-[var(--color-ink-soft)]">Expense</span>
                  <span className="font-mono font-semibold text-[var(--color-rust)]">{formatCurrency(totals.expense)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-line)] px-4 py-3 bg-[var(--color-surface)]">
                  <span className="text-sm text-[var(--color-ink-soft)]">Net</span>
                  <span className={cn("font-mono font-semibold", totals.net < 0 ? "text-[var(--color-rust)]" : "text-[var(--color-ink)]")}>{formatCurrency(totals.net)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time range</CardTitle>
              <CardDescription>Select how much history to include.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={cn(
                      "rounded-md px-3 py-2 text-left text-sm transition",
                      option.value === range
                        ? "bg-[var(--color-ledger)] text-white"
                        : "bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-black/[0.04]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity chart</CardTitle>
          <CardDescription>View income and expense history for this account.</CardDescription>
        </CardHeader>
        <CardContent className="h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#565f5b" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#565f5b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 8, borderColor: "var(--color-line)" }} />
              <Bar dataKey="income" fill="var(--color-ledger)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="var(--color-rust)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div />
        <Button onClick={() => navigate(`/transactions/create?accountId=${id}`)}>
          <Plus className="h-4 w-4" /> New transaction
        </Button>
      </div>
    </div>
  );
}
