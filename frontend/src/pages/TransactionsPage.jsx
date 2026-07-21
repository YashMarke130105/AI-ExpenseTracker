import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { TransactionsTable } from "../components/TransactionsTable";
import { api } from "../lib/api";
import { useCategories } from "../lib/useCategories";
import { formatCurrency } from "../lib/utils";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - i);

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { categories, colors } = useCategories();

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedAccountId, setSelectedAccountId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [recurringFilter, setRecurringFilter] = useState("ALL");
  const [dateFilterDay, setDateFilterDay] = useState("ALL");
  const [dateFilterMonth, setDateFilterMonth] = useState("ALL");
  const [dateFilterYear, setDateFilterYear] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await api.get("/dashboard/accounts");
      setAccounts(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccountId !== "ALL") params.set("accountId", selectedAccountId);
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
      setTransactions(result.transactions || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [selectedAccountId, search, typeFilter, recurringFilter, dateFilterDay, dateFilterMonth, dateFilterYear, sortBy, sortOrder, page]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, txn) => {
        if (txn.type === "INCOME") acc.income += txn.amount;
        else acc.expense += txn.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const selectedAccountName = useMemo(() => {
    if (selectedAccountId === "ALL") return "All accounts";
    return accounts.find((account) => account.id === selectedAccountId)?.name || "Selected account";
  }, [accounts, selectedAccountId]);

  function handleAccountChange(value) {
    setPage(1);
    setSelectedAccountId(value);
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-soft)]">Loading transactions…</p>;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium">Transactions</h1>
          <p className="mt-1 text-[var(--color-ink-soft)]">
            Browse every transaction and switch between accounts from one view.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            navigate("/transactions/create", { replace: false });
          }}
        >
          <Plus className="h-4 w-4" /> New transaction
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-[var(--color-rust-soft)] px-3 py-2 text-sm text-[var(--color-rust)]">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Transaction list</CardTitle>
                <CardDescription>Filter by account, type, and date to review your activity.</CardDescription>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink-soft)]">
                <Filter className="h-4 w-4" />
                {selectedAccountName}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm text-[var(--color-ink-soft)]">Account</label>
                <Select value={selectedAccountId} onChange={(e) => handleAccountChange(e.target.value)}>
                  <option value="ALL">All accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-ink-soft)]">Search</label>
                <Input
                  type="search"
                  placeholder="Description"
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-ink-soft)]">Type</label>
                <Select value={typeFilter} onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }}>
                  <option value="ALL">All types</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-ink-soft)]">Recurring</label>
                <Select value={recurringFilter} onChange={(e) => { setPage(1); setRecurringFilter(e.target.value); }}>
                  <option value="ALL">All</option>
                  <option value="RECURRING">Recurring</option>
                  <option value="ONEOFF">One-off</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-ink-soft)]">Day</label>
                <Select value={dateFilterDay} onChange={(e) => { setPage(1); setDateFilterDay(e.target.value); }}>
                  <option value="ALL">All days</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={String(day)}>{day}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-ink-soft)]">Month</label>
                <Select value={dateFilterMonth} onChange={(e) => { setPage(1); setDateFilterMonth(e.target.value); }}>
                  <option value="ALL">All months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {new Date(0, i).toLocaleString("default", { month: "short" })}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-ink-soft)]">Year</label>
                <Select value={dateFilterYear} onChange={(e) => { setPage(1); setDateFilterYear(e.target.value); }}>
                  <option value="ALL">All years</option>
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-5">
              {tableLoading ? (
                <p className="text-sm text-[var(--color-ink-soft)]">Loading transactions…</p>
              ) : (
                <>
                  <TransactionsTable
                    transactions={transactions}
                    categories={categories}
                    colors={colors}
                    onEdit={(txn) => navigate(`/transactions/${txn.id}/edit`)}
                    onDelete={(txn) => navigate(`/transactions/${txn.id}/edit`)}
                    onRowClick={(txn) => navigate(`/transactions/${txn.id}/edit`)}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={(key, order) => { setSortBy(key); setSortOrder(order); }}
                  />

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-ink-soft)]">
                    <p>
                      Showing {transactions.length} of {total} transactions
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                        Previous
                      </Button>
                      <span>Page {page}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => (prev * 10 < total ? prev + 1 : prev))}
                        disabled={page * 10 >= total}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick summary</CardTitle>
              <CardDescription>Totals for the currently visible transactions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-line)] px-4 py-3">
                <span className="text-sm text-[var(--color-ink-soft)]">Income</span>
                <span className="font-mono font-semibold text-[var(--color-ledger)]">{formatCurrency(totals.income)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-line)] px-4 py-3">
                <span className="text-sm text-[var(--color-ink-soft)]">Expense</span>
                <span className="font-mono font-semibold text-[var(--color-rust)]">{formatCurrency(totals.expense)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
                <span className="text-sm text-[var(--color-ink-soft)]">Net</span>
                <span className="font-mono font-semibold text-[var(--color-ink)]">{formatCurrency(totals.income - totals.expense)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
