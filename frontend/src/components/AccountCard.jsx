import { Link } from "react-router-dom";
import { Landmark, PiggyBank } from "lucide-react";
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Switch } from "./ui/Switch";
import { formatCurrency, cn } from "../lib/utils";

export function AccountCard({ account, onSetDefault }) {
  const Icon = account.type === "SAVINGS" ? PiggyBank : Landmark;

  return (
    <Card className="relative hover:shadow-md transition-shadow">
      {/* Link sits ABOVE the content (z-10) so it actually receives clicks.
          Previously this was z-0, underneath CardContent, so nothing ever reached it. */}
      <Link
        to={`/accounts/${account.id}`}
        className="absolute inset-0 z-10"
        aria-label={`Open ${account.name} account`}
      />

      {/* z-0 + pointer-events-none: purely visual, clicks pass through to the Link above */}
      <CardContent className="relative z-0 p-5 pointer-events-none">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-[var(--color-ledger-soft)] flex items-center justify-center">
              <Icon className="h-4 w-4 text-[var(--color-ledger)]" />
            </div>
            <div>
              <div className="font-medium text-[var(--color-ink)]">{account.name}</div>
              <p className="text-xs text-[var(--color-ink-soft)] capitalize">
                {account.type.toLowerCase()} · {account._count?.transactions ?? 0} transactions
              </p>
            </div>
          </div>

          {/* z-20 + pointer-events-auto: sits above the Link, so the Switch
              intercepts its own clicks instead of triggering navigation */}
          <div className="flex items-center gap-2 relative z-20 pointer-events-auto">
            <Switch
              checked={account.isDefault}
              onCheckedChange={(checked) => checked && onSetDefault(account.id)}
              className="border border-[var(--color-line)]"
            />
            <span className="text-xs text-[var(--color-ink-soft)]">Default</span>
          </div>
        </div>

        <p
          className={cn(
            "font-mono text-2xl font-medium",
            account.balance < 0 ? "text-[var(--color-rust)]" : "text-[var(--color-ink)]"
          )}
        >
          {formatCurrency(account.balance)}
        </p>
        {account.isDefault && <Badge className="mt-2">Default</Badge>}
      </CardContent>
    </Card>
  );
}
