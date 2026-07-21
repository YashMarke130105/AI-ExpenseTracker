import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { api } from "../lib/api";
import { formatCurrency, cn } from "../lib/utils";

export default function BudgetPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [budget, setBudget] = useState(null);
  const [currentExpenses, setCurrentExpenses] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const loadAccounts = useCallback(async () => {
    const accts = await api.get("/dashboard/accounts");
    setAccounts(accts);
    const def = accts.find((a) => a.isDefault) || accts[0];
    if (def) setAccountId(def.id);
    return def?.id;
  }, []);

  const loadBudget = useCallback(async (accId) => {
    if (!accId) return;
    const data = await api.get(`/budgets/current?accountId=${accId}`);
    setBudget(data.budget);
    setCurrentExpenses(data.currentExpenses);
    setAmountInput(data.budget ? String(data.budget.amount) : "");
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const accId = await loadAccounts();
        await loadBudget(accId);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadAccounts, loadBudget]);

  useEffect(() => {
    if (accountId) loadBudget(accountId).catch((err) => setError(err.message));
  }, [accountId, loadBudget]);

  async function handleSave(e) {
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

  if (loading) return <p className="text-sm text-[var(--color-ink-soft)]">Loading budget…</p>;

  const budgetAmount = budget?.amount ?? 0;
  const pct = budgetAmount > 0 ? Math.min(100, (currentExpenses / budgetAmount) * 100) : 0;
  const over = budgetAmount > 0 && currentExpenses > budgetAmount;

  return (
    <div className="flex flex-col gap-6 max-w-xl animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-medium">Budget</h1>
        <p className="text-[var(--color-ink-soft)] mt-1">
          Set a monthly spending limit and track it against one account.
        </p>
      </div>

      {accounts.length > 1 && (
        <div className="flex flex-col gap-1.5 max-w-xs">
          <label className="text-sm font-medium">Tracking account</label>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>This month</CardTitle>
          <CardDescription>
            {budgetAmount > 0
              ? `${formatCurrency(currentExpenses)} of ${formatCurrency(budgetAmount)} spent`
              : "No budget set yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {budgetAmount > 0 && (
            <div className="h-2.5 w-full rounded-full bg-[var(--color-line)] overflow-hidden mb-1">
              <div
                className={cn("h-full rounded-full transition-all", over ? "bg-[var(--color-rust)]" : "bg-[var(--color-ledger)]")}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {over && (
            <p className="text-xs text-[var(--color-rust)]">
              {formatCurrency(currentExpenses - budgetAmount)} over budget
            </p>
          )}

          <form onSubmit={handleSave} className="flex items-end gap-3 mt-5">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium">Monthly budget</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="e.g. 2500"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
          {saved && <p className="text-sm text-[var(--color-ledger)] mt-2">Budget updated.</p>}
          {error && <p className="text-sm text-[var(--color-rust)] mt-2">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
