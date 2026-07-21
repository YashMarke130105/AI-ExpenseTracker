import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { AccountCard } from "../components/AccountCard";
import { NewAccountDialog } from "../components/NewAccountDialog";
import { TransactionsTable } from "../components/TransactionsTable";
import { api } from "../lib/api";
import { useCategories } from "../lib/useCategories";
import { formatCurrency } from "../lib/utils";
import { Select } from "../components/ui/Select";

export default function DashboardPage() {
  const { categories, colors } = useCategories();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [chartAccountId, setChartAccountId] = useState(null);
  const [recentAccountId, setRecentAccountId] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [chartRange, setChartRange] = useState("today");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accts, txns] = await Promise.all([
        api.get("/dashboard/accounts"),
        api.get("/dashboard/transactions"),
      ]);
      setAccounts(accts);
      setTransactions(txns);
      const defaultAccount = accts.find((a) => a.isDefault) || accts[0];
      setChartAccountId(defaultAccount?.id || null);
      setRecentAccountId(defaultAccount?.id || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!chartAccountId) return;
    api.get(`/budgets/current?accountId=${chartAccountId}`)
      .then((data) => setBudgetData(data))
      .catch(() => setBudgetData(null));
  }, [chartAccountId, transactions]);

  async function handleSetDefault(accountId) {
    const prev = accounts;
    setAccounts((a) => a.map((acc) => ({ ...acc, isDefault: acc.id === accountId })));
    try {
      await api.patch(`/accounts/${accountId}/default`);
    } catch (err) {
      setAccounts(prev);
      setError(err.message);
    }
  }

  const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];
  useEffect(() => {
    if (!defaultAccount) return;
    setChartAccountId((current) => current || defaultAccount.id);
    setRecentAccountId((current) => current || defaultAccount.id);
  }, [defaultAccount]);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
    [accounts]
  );

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    let startDate = null;
    if (chartRange === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (chartRange === "7d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (chartRange === "1m") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (chartRange === "3m") {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
    } else if (chartRange === "1y") {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const buckets = {};
    for (const t of transactions) {
      if (t.accountId !== chartAccountId) continue;
      if (startDate && new Date(t.date) < startDate) continue;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { key, income: 0, expense: 0 };
      if (t.type === "INCOME") buckets[key].income += t.amount;
      else buckets[key].expense += t.amount;
    }

    return Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => ({
        ...m,
        label: new Date(`${m.key}-01`).toLocaleDateString("en-US", { month: "short" }),
      }));
  }, [transactions, chartAccountId, chartRange]);

  const chartAccountTransactions = useMemo(
    () => transactions.filter((t) => t.accountId === chartAccountId),
    [transactions, chartAccountId]
  );

  const recentAccountTransactions = useMemo(
    () => transactions.filter((t) => t.accountId === recentAccountId).slice(0, 5),
    [transactions, recentAccountId]
  );
  
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return chartAccountTransactions
      .filter((t) => t.type === "EXPENSE")
      .filter((t) => new Date(t.date) >= start)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});
  }, [chartAccountTransactions]);

  const pieData = useMemo(
    () =>
      Object.entries(currentMonthExpenses).map(([category, amount]) => ({
        name: categories.find((c) => c.id === category)?.name ?? category,
        category,
        value: amount,
      })),
    [currentMonthExpenses, categories]
  );

  const selectedChartAccount = accounts.find((a) => a.id === chartAccountId);
  const selectedRecentAccount = accounts.find((a) => a.id === recentAccountId);

  const budgetAmount = budgetData?.budget?.amount ?? 0;
  const currentExpenses = budgetData?.currentExpenses ?? 0;
  const budgetPct = budgetAmount > 0 ? Math.min(100, (currentExpenses / budgetAmount) * 100) : 0;
  const budgetOver = budgetAmount > 0 && currentExpenses > budgetAmount;

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-soft)]">Loading your books…</p>;
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium">Dashboard</h1>
          <p className="text-[var(--color-ink-soft)] mt-1">
            Total across accounts: <span className="font-mono font-medium text-[var(--color-ink)]">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewAccount(true)}>
            <Plus className="h-4 w-4" /> Account
          </Button>
          <Button onClick={() => window.location.assign("/transactions/create")} disabled={!accounts.length}>
            <Plus className="h-4 w-4" /> Transaction
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-rust)] bg-[var(--color-rust-soft)] rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="font-display text-lg mb-1">No accounts yet</p>
            <p className="text-sm text-[var(--color-ink-soft)] mb-4">
              Add your first account to start logging transactions.
            </p>
            <Button onClick={() => setShowNewAccount(true)} className="mx-auto">
              <Plus className="h-4 w-4" /> Add an account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} onSetDefault={handleSetDefault} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Expense breakdown</CardTitle>
                <CardDescription>
                  Current month expenses by category for the selected account.
                </CardDescription>
              </div>
              <div className="min-w-[12rem]">
                <Select value={chartAccountId ?? ""} onChange={(e) => setChartAccountId(e.target.value)}>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-80">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={pieData} nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={3}>
                    {pieData.map((entry) => (
                      <Cell key={entry.category} fill={colors[entry.category] ?? "#c7d2fe"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 8, borderColor: "var(--color-line)" }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--color-ink-soft)]">
                No expense data for this account this month.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget</CardTitle>
              <CardDescription>
                Track the spending progress for the selected account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--color-ink-soft)]">{selectedChartAccount?.name || "Account"}</p>
                  <p className="font-display text-xl font-semibold mt-1">
                    {budgetAmount > 0 ? formatCurrency(currentExpenses) : "No budget"}
                  </p>
                  {budgetAmount > 0 && (
                    <p className="text-sm text-[var(--color-ink-soft)]">
                      of {formatCurrency(budgetAmount)} spent
                    </p>
                  )}
                </div>
              </div>
              {budgetAmount > 0 && (
                <div className="mt-5 space-y-3">
                  <div className="h-2.5 w-full rounded-full bg-[var(--color-line)] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${budgetOver ? "bg-[var(--color-rust)]" : "bg-[var(--color-ledger)]"}`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                  <p className={`text-xs ${budgetOver ? "text-[var(--color-rust)]" : "text-[var(--color-ink-soft)]"}`}>
                    {budgetOver ? `${formatCurrency(currentExpenses - budgetAmount)} over budget` : `${Math.round(budgetPct)}% used`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <CardTitle>Income vs. expenses</CardTitle>
                  <CardDescription>Separate bars for income and expense over the selected period.</CardDescription>
                </div>
                <div className="min-w-[10rem]">
                  <Select value={chartRange} onChange={(e) => setChartRange(e.target.value)}>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="1m">Last 1 month</option>
                    <option value="3m">Last 3 months</option>
                    <option value="1y">Last 1 year</option>
                    <option value="all">All time</option>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#565f5b" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#565f5b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, borderColor: "var(--color-line)" }} />
                  <Bar dataKey="income" fill="#16a34a" radius={[3, 3, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="#f97316" radius={[3, 3, 0, 0]} name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>Last five transactions for the selected account.</CardDescription>
            </div>
            <div className="min-w-[12rem]">
              <Select value={recentAccountId ?? ""} onChange={(e) => setRecentAccountId(e.target.value)}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionsTable
            transactions={recentAccountTransactions}
            categories={categories}
            colors={colors}
          />
        </CardContent>
      </Card>


      <NewAccountDialog
        open={showNewAccount}
        onClose={() => setShowNewAccount(false)}
        onSaved={load}
        isFirstAccount={accounts.length === 0}
      />
    </div>
  );
}
