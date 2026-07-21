import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "./ui/Drawer";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select } from "./ui/Select";
import { api } from "../lib/api";

export function EditAccountDialog({ open, account, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", type: "CURRENT", balance: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account) {
      setForm({
        name: account.name || "",
        type: account.type || "CURRENT",
        balance: account.balance?.toString() || "",
      });
    }
  }, [account, open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!account) return;
    setError("");
    setBusy(true);
    try {
      await api.patch(`/accounts/${account.id}`, {
        name: form.name,
        type: form.type,
        balance: Number(form.balance || 0),
      });
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
          <DrawerTitle>Edit account</DrawerTitle>
          <DrawerDescription>Update the account name, type, or balance.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
              <Label>Balance</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

          <DrawerFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
