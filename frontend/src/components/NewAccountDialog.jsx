import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "./ui/Drawer";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select } from "./ui/Select";
import { api } from "../lib/api";

export function NewAccountDialog({ open, onClose, onSaved, isFirstAccount }) {
  const [form, setForm] = useState({ name: "", type: "CURRENT", balance: "", isDefault: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/dashboard/accounts", {
        name: form.name,
        type: form.type,
        balance: Number(form.balance || 0),
        isDefault: form.isDefault,
      });
      setForm({ name: "", type: "CURRENT", balance: "", isDefault: false });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="w-full max-w-xl">
        <DrawerHeader>
          <DrawerTitle>New account</DrawerTitle>
          <DrawerDescription>Add a checking or savings account to track.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Everyday Checking"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="CURRENT">Current</option>
                <option value="SAVINGS">Savings</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Starting balance</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {!isFirstAccount && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-[var(--color-line)] accent-[var(--color-ledger)]"
              />
              Make this my default account
            </label>
          )}

          {isFirstAccount && (
            <p className="text-xs text-[var(--color-ink-soft)]">
              This will be set as your default account automatically.
            </p>
          )}

          {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

          <DrawerFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
