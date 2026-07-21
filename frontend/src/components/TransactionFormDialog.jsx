import { useEffect, useRef, useState } from "react";
import { ScanLine, Loader2 } from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select } from "./ui/Select";
import { api } from "../lib/api";
import { useCategories } from "../lib/useCategories";

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

// Handles both creating a new transaction and editing an existing one,
// depending on whether `transaction` is passed in.
export function TransactionFormDialog({ open, onClose, accounts, transaction, defaultAccountId, onSaved }) {
  const { categories } = useCategories();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);

  const isEditing = Boolean(transaction);

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: String(transaction.amount),
        description: transaction.description || "",
        date: new Date(transaction.date).toISOString().slice(0, 10),
        category: transaction.category,
        accountId: transaction.accountId,
        isRecurring: transaction.isRecurring,
        recurringInterval: transaction.recurringInterval || "MONTHLY",
      });
    } else {
      setForm({ ...emptyForm, accountId: defaultAccountId || accounts?.[0]?.id || "" });
    }
    setError("");
  }, [open, transaction, defaultAccountId, accounts]);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  async function handleScanReceipt(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("receipt", file);
      const data = await api.postForm("/transactions/scan-receipt", fd);
      setForm((f) => ({
        ...f,
        amount: data.amount != null ? String(data.amount) : f.amount,
        description: data.description || f.description,
        date: data.date ? new Date(data.date).toISOString().slice(0, 10) : f.date,
        category: data.category || f.category,
        type: "EXPENSE",
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.accountId) return setError("Choose an account.");
    if (!form.category) return setError("Choose a category.");
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
        await api.put(`/transactions/${transaction.id}`, payload);
      } else {
        await api.post("/transactions", payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit transaction" : "New transaction"}
      description={isEditing ? "Update the details below." : "Log an income or expense."}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <div className="grid grid-cols-2 gap-3">
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
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
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
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Account</Label>
          <Select
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            required
          >
            <option value="">Select…</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
            className="h-4 w-4 rounded border-[var(--color-line)] accent-[var(--color-ledger)]"
          />
          Recurring transaction
        </label>

        {form.isRecurring && (
          <div className="flex flex-col gap-1.5">
            <Label>Repeats</Label>
            <Select
              value={form.recurringInterval}
              onChange={(e) => setForm({ ...form, recurringInterval: e.target.value })}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </Select>
          </div>
        )}

        {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : isEditing ? "Save changes" : "Add transaction"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
