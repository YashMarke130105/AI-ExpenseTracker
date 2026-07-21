import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { AccountCard } from "../components/AccountCard";
import { NewAccountDialog } from "../components/NewAccountDialog";
import { EditAccountDialog } from "../components/EditAccountDialog";
import { api } from "../lib/api";
import { formatCurrency, cn } from "../lib/utils";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [budgetAccountId, setBudgetAccountId] = useState("");
  const [budget, setBudget] = useState(null);
  const [currentExpenses, setCurrentExpenses] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/dashboard/accounts");
      setAccounts(data);
      const defaultAccount = data.find((account) => account.isDefault) || data[0];
      if (defaultAccount) {
        setBudgetAccountId(defaultAccount.id);
        const budgetData = await api.get(`/budgets/current?accountId=${defaultAccount.id}`);
        setBudget(budgetData.budget);
        setCurrentExpenses(budgetData.currentExpenses);
        setAmountInput(budgetData.budget ? String(budgetData.budget.amount) : "");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadBudget = useCallback(async (accountId) => {
    if (!accountId) return;
    try {
      const budgetData = await api.get(`/budgets/current?accountId=${accountId}`);
      setBudget(budgetData.budget);
      setCurrentExpenses(budgetData.currentExpenses);
      setAmountInput(budgetData.budget ? String(budgetData.budget.amount) : "");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (budgetAccountId) {
      loadBudget(budgetAccountId);
    }
  }, [budgetAccountId, loadBudget]);

  async function handleSetDefault(accountId) {
    const prev = accounts;
    setAccounts((current) => current.map((acc) => ({ ...acc, isDefault: acc.id === accountId })));
    try {
      await api.patch(`/accounts/${accountId}/default`);
    } catch (err) {
      setAccounts(prev);
      setError(err.message);
    }
  }

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + (account.balance || 0), 0),
    [accounts]
  );

  const budgetAmount = budget?.amount ?? 0;
  const pct = budgetAmount > 0 ? Math.min(100, (currentExpenses / budgetAmount) * 100) : 0;
  const over = budgetAmount > 0 && currentExpenses > budgetAmount;

  async function handleSaveBudget(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.put("/budgets", { amount: Number(amountInput) });
      setBudget(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-soft)]">Loading accounts…</p>;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium">Accounts</h1>
          <p className="mt-1 text-[var(--color-ink-soft)]">
            Total across accounts: <span className="font-mono font-medium text-[var(--color-ink)]">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <Button onClick={() => setShowNewAccount(true)}>
          <Plus className="h-4 w-4" /> Add account
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-[var(--color-rust-soft)] px-3 py-2 text-sm text-[var(--color-rust)]">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Budget</CardTitle>
          <CardDescription>Track spending for the selected account from the same screen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length > 1 && (
            <div className="max-w-xs space-y-1.5">
              <label className="text-sm font-medium">Tracking account</label>
              <Select value={budgetAccountId} onChange={(e) => setBudgetAccountId(e.target.value)}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="rounded-lg border border-[var(--color-line)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--color-ink-soft)]">This month</p>
                <p className="font-display text-xl font-semibold">
                  {budgetAmount > 0 ? `${formatCurrency(currentExpenses)} of ${formatCurrency(budgetAmount)} spent` : "No budget set yet."}
                </p>
              </div>
            </div>
            {budgetAmount > 0 && (
              <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
                <div className={cn("h-full rounded-full transition-all", over ? "bg-[var(--color-rust)]" : "bg-[var(--color-ledger)]")} style={{ width: `${pct}%` }} />
              </div>
            )}
            {over && <p className="text-xs text-[var(--color-rust)]">{formatCurrency(currentExpenses - budgetAmount)} over budget</p>}

            <form onSubmit={handleSaveBudget} className="mt-5 flex flex-wrap items-end gap-3">
              <div className="min-w-[14rem] flex-1 space-y-1.5">
                <label className="text-sm font-medium">Monthly budget</label>
                <Input type="number" step="0.01" min="0" required value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="e.g. 2500" />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </form>
            {saved && <p className="mt-2 text-sm text-[var(--color-ledger)]">Budget updated.</p>}
          </div>
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="mb-1 font-display text-lg">No accounts yet</p>
            <p className="mb-4 text-sm text-[var(--color-ink-soft)]">
              Create your first account to start tracking balances.
            </p>
            <Button onClick={() => setShowNewAccount(true)} className="mx-auto">
              <Plus className="h-4 w-4" /> Create account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <div key={account.id} className="relative">
              <AccountCard account={account} onSetDefault={handleSetDefault} />
              <button
                type="button"
                onClick={() => setEditingAccount(account)}
                className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-white/90 text-[var(--color-ink-soft)] shadow-sm transition hover:text-[var(--color-ledger)]"
                aria-label={`Edit ${account.name}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <NewAccountDialog
        open={showNewAccount}
        onClose={() => setShowNewAccount(false)}
        onSaved={load}
        isFirstAccount={accounts.length === 0}
      />

      <EditAccountDialog
        open={Boolean(editingAccount)}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSaved={load}
      />
    </div>
  );
}
