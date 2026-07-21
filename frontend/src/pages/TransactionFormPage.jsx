import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ScanLine, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useCategories } from "../lib/useCategories";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Select } from "../components/ui/Select";

const emptyForm = {
  type: "EXPENSE",
  amount: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  category: "",
  accountId: "",
  isRecurring: false,
  recurringInterval: "MONTHLY",
};

export default function TransactionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { categories } = useCategories();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const queryAccountId = new URLSearchParams(location.search).get("accountId");
    let mounted = true;

    async function load() {
      try {
        const [accts, txn] = await Promise.all([
          api.get("/dashboard/accounts"),
          id ? api.get(`/transactions/${id}`) : Promise.resolve(null),
        ]);

        if (!mounted) return;
        setAccounts(accts);

        if (id) {
          const transaction = txn;
          setIsEditing(true);
          setForm({
            type: transaction.type,
            amount: String(transaction.amount),
            description: transaction.description || "",
            date: new Date(transaction.date).toISOString().slice(0, 10),
            category: transaction.category,
            accountId: transaction.accountId || transaction.accountId,
            isRecurring: transaction.isRecurring,
            recurringInterval: transaction.recurringInterval || "MONTHLY",
          });
        } else {
          setForm({
            ...emptyForm,
            accountId:
              queryAccountId || accts.find((acct) => acct.isDefault)?.id || accts[0]?.id || "",
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, location.search]);

  async function handleScanReceipt(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("receipt", file);
      const data = await api.postForm("/transactions/scan-receipt", fd);
      setForm((current) => ({
        ...current,
        amount: data.amount != null ? String(data.amount) : current.amount,
        description: data.description || current.description,
        date: data.date ? new Date(data.date).toISOString().slice(0, 10) : current.date,
        category: data.category || current.category,
        type: "EXPENSE",
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const payload = {
        type: form.type,
        amount: Number(form.amount),
        description: form.description || null,
        date: form.date,
        category: form.category,
        accountId: form.accountId,
        isRecurring: form.isRecurring,
        recurringInterval: form.isRecurring ? form.recurringInterval : null,
        status: "COMPLETED",
      };

      if (isEditing) {
        await api.put(`/transactions/${id}`, payload);
      } else {
        await api.post("/transactions", payload);
      }

      navigate(isEditing ? -1 : "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filteredCategories = categories.filter((c) => c.type === form.type);

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-soft)]">Loading transaction form…</p>;
  }

  return (
    <div className="max-w-3xl animate-fade-up">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="font-display text-3xl font-semibold">{isEditing ? "Edit transaction" : "New transaction"}</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            {isEditing ? "Update the transaction details." : "Create a new income or expense."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit transaction" : "New transaction"}</CardTitle>
          <CardDescription>{isEditing ? "Update the details below." : "Log an income or expense."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-5">
            {!isEditing && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleScanReceipt}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={scanning}
                >
                  {scanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="h-4 w-4" />
                  )}
                  {scanning ? "Reading receipt…" : "Scan a receipt"}
                </Button>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value, category: "" })}
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Account</Label>
                <Select
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Recurring</Label>
                <div className="flex flex-col gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                      className="h-4 w-4 rounded border-[var(--color-line)] accent-[var(--color-ledger)]"
                    />
                    Repeat transaction
                  </label>
                  {form.isRecurring && (
                    <Select
                      value={form.recurringInterval}
                      onChange={(e) => setForm({ ...form, recurringInterval: e.target.value })}
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : isEditing ? "Save transaction" : "Add transaction"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
